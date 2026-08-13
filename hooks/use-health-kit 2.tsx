import {
  deleteObjects,
  queryCorrelationSamples,
  saveCorrelationSample,
  useHealthkitAuthorization,
  useIsHealthDataAvailable,
} from '@kingstinct/react-native-healthkit';
import { createContext, use, useCallback, useMemo, useState } from 'react';

import { KVStore } from '@/hooks/kv-store';
import { Entry, ImportedFoodSample } from '@/utils/entries';

const STORAGE_KEY = 'health-sync-enabled';

const ENERGY_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryEnergyConsumed' as const;
const CARBS_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryCarbohydrates' as const;
const PROTEIN_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryProtein' as const;
const FAT_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryFatTotal' as const;

/** A logged entry writes one `HKCorrelationTypeIdentifierFood` bundling these. */
const FOOD_TYPE = 'HKCorrelationTypeIdentifierFood' as const;

/** What a logged entry writes to Health — asked for up front, all at once. */
const WRITE_IDENTIFIERS = [
  ENERGY_IDENTIFIER,
  CARBS_IDENTIFIER,
  PROTEIN_IDENTIFIER,
  FAT_IDENTIFIER,
] as const;

function readEnabled(): boolean {
  try {
    return KVStore.getItemSync(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

type HealthKitContextValue = {
  /** False on Android, web, and any iOS device without Health (e.g. some iPads). */
  isAvailable: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** Writes one logged entry's energy and macros to Health, as a single food correlation. */
  syncEntry: (entry: Entry, loggedAt: Date) => Promise<string | undefined>;
  /** Removes whatever `syncEntry` wrote for an entry, given the uuid it returned. */
  unsyncEntry: (healthSampleId: string) => void;
};

const HealthKitContext = createContext<HealthKitContextValue | null>(null);

/**
 * Mirrors logged food into Apple Health. Off by default — the user opts in
 * from Settings, which is also what triggers the system permission prompt.
 * `@kingstinct/react-native-healthkit` degrades to inert stubs off-iOS, so
 * nothing here needs its own platform guard.
 */
export function HealthKitProvider({ children }: { children: React.ReactNode }) {
  const isAvailable = useIsHealthDataAvailable() ?? false;
  const [enabled, setEnabledState] = useState(readEnabled);
  const [, requestAuthorization] = useHealthkitAuthorization({ toWrite: WRITE_IDENTIFIERS });

  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);

      try {
        KVStore.setItemSync(STORAGE_KEY, next ? 'true' : 'false');
      } catch {
        // Best effort — the choice still holds for the rest of this session.
      }

      // HealthKit only ever prompts once per type; asking again after that
      // just re-reads the (possibly still-denied) status, which is harmless.
      if (next) void requestAuthorization();
    },
    [requestAuthorization],
  );

  const syncEntry = useCallback(
    async (entry: Entry, loggedAt: Date): Promise<string | undefined> => {
      if (!enabled || !isAvailable) return undefined;

      const samples = [
        entry.calories > 0 && {
          quantityType: ENERGY_IDENTIFIER,
          quantity: entry.calories,
          unit: 'kcal',
          startDate: loggedAt,
          endDate: loggedAt,
        },
        entry.carbs > 0 && {
          quantityType: CARBS_IDENTIFIER,
          quantity: entry.carbs,
          unit: 'g',
          startDate: loggedAt,
          endDate: loggedAt,
        },
        entry.protein > 0 && {
          quantityType: PROTEIN_IDENTIFIER,
          quantity: entry.protein,
          unit: 'g',
          startDate: loggedAt,
          endDate: loggedAt,
        },
        entry.fat > 0 && {
          quantityType: FAT_IDENTIFIER,
          quantity: entry.fat,
          unit: 'g',
          startDate: loggedAt,
          endDate: loggedAt,
        },
      ].filter((sample) => sample !== false);

      if (samples.length === 0) return undefined;

      const correlation = await saveCorrelationSample(FOOD_TYPE, samples, loggedAt, loggedAt, {
        HKFoodType: entry.name,
      });

      return correlation?.uuid;
    },
    [enabled, isAvailable],
  );

  const unsyncEntry = useCallback((healthSampleId: string) => {
    void deleteObjects(FOOD_TYPE, { uuid: healthSampleId });
  }, []);

  const value = useMemo(
    () => ({ isAvailable, enabled, setEnabled, syncEntry, unsyncEntry }),
    [enabled, isAvailable, setEnabled, syncEntry, unsyncEntry],
  );

  return <HealthKitContext value={value}>{children}</HealthKitContext>;
}

export function useHealthKit(): HealthKitContextValue {
  const context = use(HealthKitContext);
  if (!context) throw new Error('useHealthKit must be used inside a HealthKitProvider');

  return context;
}
