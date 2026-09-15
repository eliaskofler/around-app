import { AuthorizationStatus, authorizationStatusFor, deleteObjects, queryQuantitySamples, saveQuantitySample, subscribeToChanges } from '@kingstinct/react-native-healthkit';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { KVStore } from '@/hooks/kv-store';
import { askForAuthorization, OWN_BUNDLE_ID, useHealthKit } from '@/hooks/use-health-kit';
import { toDateKey } from '@/utils/date';
import { validWeightDate, WeightEntry } from '@/utils/progress';

const TYPE = 'HKQuantityTypeIdentifierBodyMass' as const;
const KEY = 'progress-weight-v1';
type StoredWeight = WeightEntry & { version?: number; pending?: boolean; deleted?: boolean };

function read(): StoredWeight[] {
  const raw = Platform.OS === 'web' ? window.localStorage.getItem(KEY) : KVStore.getItemSync(KEY);
  const value: unknown = JSON.parse(raw ?? '[]');
  if (!Array.isArray(value) || !value.every(w => w && typeof w.date === 'string' && validWeightDate(w.date) && Number.isFinite(w.kg) && w.kg > 0 && w.kg <= 700)) {
    throw new Error('Weight history could not be loaded.');
  }
  return value;
}

function write(value: StoredWeight[]) {
  const json = JSON.stringify(value);
  if (Platform.OS === 'web') window.localStorage.setItem(KEY, json);
  else KVStore.setItemSync(KEY, json);
}

export function useWeightLog(active: boolean) {
  const { isAvailable, enabled } = useHealthKit();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const refresh = useCallback(async () => {
    if (!active || lock.current) return;
    lock.current = true;
    setBusy(true);
    let local: StoredWeight[];
    try {
      local = read();
      setLoadError(false);
      setWeights(local.filter(w => !w.deleted).sort((a, b) => a.date.localeCompare(b.date)));
    } catch {
      setLoadError(true);
      setError('Weight history could not be loaded.');
      lock.current = false;
      setBusy(false);
      return;
    }
    try {
      setError('');
      if (!isAvailable) return;
      await askForAuthorization();
      const canWrite = enabled && authorizationStatusFor(TYPE) === AuthorizationStatus.sharingAuthorized;
      // Persist the retry version before writing. HealthKit replaces the same
      // sync identifier rather than duplicating a sample after an interrupted save.
      local = local.map(w => w.version ? w : { ...w, version: Date.now(), pending: true });
      write(local);
      if (canWrite) {
        for (const entry of [...local]) {
          if (!entry.pending) continue;
          if (entry.deleted) {
            await deleteObjects(TYPE, { metadata: {
              withMetadataKey: 'HKSyncIdentifier',
              value: `${OWN_BUNDLE_ID}.weight.${entry.date}`,
            } });
            if (entry.healthSampleId) await deleteObjects(TYPE, { uuid: entry.healthSampleId });
            local = local.filter(w => w.date !== entry.date);
          } else {
            const timestamp = new Date(`${entry.date}T12:00:00`);
            if (timestamp > new Date()) timestamp.setTime(Date.now());
            const sample = await saveQuantitySample(TYPE, 'kg', entry.kg, timestamp, timestamp, {
              HKSyncIdentifier: `${OWN_BUNDLE_ID}.weight.${entry.date}`,
              HKSyncVersion: entry.version!,
              // v14 intersects valid metadata with Record<string, never>.
              // The native quantity writer accepts these standard HealthKit keys.
            } as unknown as Parameters<typeof saveQuantitySample<typeof TYPE>>[5]);
            if (!sample) throw new Error('Weight could not be saved to Apple Health.');
            local = local.map(w => w.date === entry.date ? { ...entry, pending: false, healthSampleId: sample.uuid } : w);
          }
          write(local);
        }
      } else if (local.some(w => w.pending)) {
        setError(enabled ? 'Saved locally. Allow Weight writes for Around in Health to sync.' : 'Saved locally. Turn on Health sync in Settings to sync weight.');
      }

      const samples = await queryQuantitySamples(TYPE, { unit: 'kg', limit: 0, ascending: true });
      const byDate = new Map<string, WeightEntry>();
      for (const sample of samples) {
        const date = toDateKey(sample.startDate);
        if (!validWeightDate(date) || !Number.isFinite(sample.quantity) || sample.quantity <= 0) continue;
        byDate.set(date, { date, kg: sample.quantity, healthSampleId: sample.uuid,
          healthReadOnly: sample.sourceRevision.source.bundleIdentifier !== OWN_BUNDLE_ID });
      }
      for (const entry of local) {
        if (entry.deleted) byDate.delete(entry.date);
        else byDate.set(entry.date, entry);
      }
      setWeights([...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)));
    } catch {
      setError('Apple Health sync did not finish. Local entries are safe; retry to sync.');
      setWeights(local.filter(w => !w.deleted).sort((a, b) => a.date.localeCompare(b.date)));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [active, enabled, isAvailable]);

  useFocusEffect(useCallback(() => {
    if (!active) return;
    void refresh();
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    let subscription: { remove: () => void } | undefined;
    try {
      if (isAvailable) subscription = subscribeToChanges(TYPE, () => { void refresh(); });
    } catch {
      // Foreground and manual refresh still work if observation is unavailable.
    }
    return () => { foreground.remove(); subscription?.remove(); };
  }, [active, isAvailable, refresh]));

  function persist(next: WeightEntry[]) {
    if (lock.current || loadError) return false;
    try {
      const previous = read();
      const updated: StoredWeight[] = previous.filter(w => w.deleted);
      for (const entry of next) {
        if (entry.healthReadOnly) continue;
        const old = previous.find(w => w.date === entry.date && !w.deleted);
        updated.push(old && old.kg === entry.kg ? old : {
          ...entry, pending: true, version: Math.max(Date.now(), (old?.version ?? 0) + 1),
        });
      }
      for (const entry of weights) {
        if (!entry.healthReadOnly && !next.some(w => w.date === entry.date)) {
          updated.push({ ...entry, deleted: true, pending: true, version: Date.now() });
        }
      }
      // A new entry for a date supersedes any queued deletion for that date.
      write(updated.filter(w => !w.deleted || !next.some(n => !n.healthReadOnly && n.date === w.date)));
      setWeights(next);
      void refresh();
      return true;
    } catch {
      setError('Could not save weight on this device. Please try again.');
      return false;
    }
  }

  return { weights, persist, error, loadError, busy, refresh, isAvailable };
}
