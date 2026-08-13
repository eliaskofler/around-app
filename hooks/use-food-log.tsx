import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { OWN_BUNDLE_ID, useHealthKit } from '@/hooks/use-health-kit';
import { resolveSourceIconUrl } from '@/hooks/use-source-icon';
import { addDays, DateKey, startOfToday, toDateKey } from '@/utils/date';
import {
  deleteEntryRow,
  deleteSectionRow,
  initDatabase,
  insertEntry,
  loadEntries,
  loadSections,
  reassignSectionEntries,
  reindexSection,
  seedSections,
  setSectionHiddenRow,
  updateEntryFields,
  updateEntryHealthSampleId,
  upsertSection,
} from '@/utils/db';
import { entriesForSection, EntriesByDate, Entry, EntryDraft, moveEntry } from '@/utils/entries';
import { matchFoodEmoji } from '@/utils/food-emoji';
import { DEFAULT_SECTIONS, Section, sectionById, sectionForNow } from '@/utils/sections';

/** How far back a silent, automatic catch-up import reaches on every foreground — kept small since it runs often and the in-memory log already holds anything caught up earlier this session. */
const AUTO_IMPORT_DAYS_BACK = 7;

/**
 * How far back the very first automatic import reaches, on cold launch — this
 * is what backfills anything logged elsewhere before the local database
 * existed, or before this device ever ran the app. Matches the "Import from
 * Health" button's own range in Settings.
 */
const AUTO_IMPORT_FULL_DAYS_BACK = 365;

type FoodLog = {
  sections: Section[];
  entriesByDate: EntriesByDate;
  entriesOn: (date: DateKey) => Entry[];
  addEntry: (date: DateKey, draft: EntryDraft) => void;
  /** Replaces an entry's editable fields in place — id, loggedAt, source and image carry over untouched. */
  updateEntry: (date: DateKey, id: string, draft: EntryDraft) => void;
  removeEntry: (date: DateKey, id: string) => void;
  /** Drops an entry into `section` at `index` — see `moveEntry` for the slots. */
  dropEntry: (date: DateKey, id: string, section: string, index: number) => void;
  /** Adds the section, or replaces the one that already has its id. */
  saveSection: (section: Section) => void;
  removeSection: (id: string) => void;
  setSectionHidden: (id: string, hidden: boolean) => void;
  /** Pulls in whatever's logged in Health within `range` that isn't already here. Returns the count added. */
  importFromHealth: (range: { start: Date; end: Date }) => Promise<number>;
};

const FoodLogContext = createContext<FoodLog | null>(null);

/**
 * The log lives here rather than in the day screen: the sheets that add food
 * and edit sections are routes of their own and write to the same state.
 *
 * Persisted locally via `utils/db.ts` (SQLite; `localStorage` on web) — the
 * in-memory state here is a cache hydrated from that database on mount, kept
 * in sync with a fire-and-forget write alongside every mutation. Health
 * import stays a fallback layered on top, for anything logged elsewhere.
 */
export function FoodLogProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<Section[]>([...DEFAULT_SECTIONS]);
  const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>({});
  const [dbLoaded, setDbLoaded] = useState(false);
  const {
    syncEntry,
    unsyncEntry,
    importEntries,
    listKnownSources,
    onHealthChange,
    isAvailable: healthAvailable,
  } = useHealthKit();

  /**
   * Hydrates from the local database once on mount — this is the log's real
   * source of truth across restarts now, Health import is only a fallback
   * for anything logged elsewhere. Gated behind `dbLoaded` below so the
   * Health effect never races this and clobbers what it just loaded.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await initDatabase();

      let loadedSections = await loadSections();
      if (!loadedSections) {
        loadedSections = [...DEFAULT_SECTIONS];
        await seedSections(loadedSections);
      }

      const loadedEntries = await loadEntries();
      if (cancelled) return;

      setSections(loadedSections);
      setEntriesByDate(loadedEntries);
      setDbLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const entriesOn = useCallback(
    (date: DateKey) => entriesByDate[date] ?? [],
    [entriesByDate],
  );

  const addEntry = useCallback(
    (date: DateKey, draft: EntryDraft) => {
      const entry: Entry = {
        ...draft,
        id: `${Date.now()}`,
        loggedAt: new Date().toISOString(),
        source: { kind: 'own' },
        emoji: matchFoodEmoji(draft.name),
      };

      const position = entriesForSection(entriesByDate[date] ?? [], entry.section).length;
      void insertEntry(date, entry, position).catch(() => {
        // Best effort — the entry is already in memory for this session either way.
      });

      setEntriesByDate((current) => ({ ...current, [date]: [...(current[date] ?? []), entry] }));

      // Fire-and-forget: the entry is already in the log, and Health is a
      // mirror of it rather than a dependency the UI waits on.
      void syncEntry(entry).then((healthSampleId) => {
        if (!healthSampleId) return;

        void updateEntryHealthSampleId(entry.id, healthSampleId).catch(() => {});

        setEntriesByDate((current) => ({
          ...current,
          [date]: (current[date] ?? []).map((candidate) =>
            candidate.id === entry.id ? { ...candidate, healthSampleId } : candidate,
          ),
        }));
      });
    },
    [entriesByDate, syncEntry],
  );

  /**
   * Replaces the editable fields of an existing entry — `id`, `loggedAt`,
   * `source` and `imageUrl` carry over from the current entry since `draft`
   * never carries them. Mirrors `dropEntry`'s approach to Health: a
   * correlation can't be edited in place, so a synced entry gets its old
   * sample deleted and a fresh one written under the same id.
   */
  const updateEntry = useCallback(
    (date: DateKey, id: string, draft: EntryDraft) => {
      const entry = entriesByDate[date]?.find((candidate) => candidate.id === id);
      if (!entry) return;

      const updated: Entry = {
        ...entry,
        ...draft,
        emoji: !entry.source || entry.source.kind === 'own' ? matchFoodEmoji(draft.name) : entry.emoji,
      };

      void updateEntryFields(date, updated).catch(() => {});

      setEntriesByDate((current) => ({
        ...current,
        [date]: (current[date] ?? []).map((candidate) => (candidate.id === id ? updated : candidate)),
      }));

      if (!entry.healthSampleId) return;

      unsyncEntry(entry.healthSampleId);

      void syncEntry(updated).then((healthSampleId) => {
        if (healthSampleId) void updateEntryHealthSampleId(id, healthSampleId).catch(() => {});

        setEntriesByDate((current) => ({
          ...current,
          [date]: (current[date] ?? []).map((candidate) =>
            candidate.id === id ? { ...candidate, healthSampleId } : candidate,
          ),
        }));
      });
    },
    [entriesByDate, syncEntry, unsyncEntry],
  );

  const removeEntry = useCallback(
    (date: DateKey, id: string) => {
      const entry = entriesByDate[date]?.find((candidate) => candidate.id === id);
      if (entry?.healthSampleId) unsyncEntry(entry.healthSampleId);

      void deleteEntryRow(id).catch(() => {});

      setEntriesByDate((current) => ({
        ...current,
        [date]: (current[date] ?? []).filter((candidate) => candidate.id !== id),
      }));
    },
    [entriesByDate, unsyncEntry],
  );

  /**
   * Skips anything whose `healthSampleId` is already logged here — covers
   * both entries this app already mirrored out and a re-run of the import
   * itself picking the same range twice. The known-ids check has to happen
   * *inside* the functional update, against `current` rather than the
   * `entriesByDate` closure: several things can call this concurrently now
   * (the mount-time full import, the foreground catch-up, and one callback
   * per observer-registered type — HealthKit fires each observer once
   * immediately on registration) and every one of them awaits `importEntries`
   * before writing, so a check against the outer closure would still see the
   * pre-import snapshot and every caller would decide the same samples were
   * fresh, duplicating them instead of skipping.
   */
  const importFromHealth = useCallback(
    async (range: { start: Date; end: Date }): Promise<number> => {
      const samples = await importEntries(range);
      if (samples.length === 0) return 0;

      let addedCount = 0;
      const rowsToPersist: { date: DateKey; entry: Entry; position: number }[] = [];

      setEntriesByDate((current) => {
        const known = new Set(
          Object.values(current)
            .flat()
            .map((entry) => entry.healthSampleId)
            .filter((id): id is string => id !== undefined),
        );
        const fresh = samples.filter((sample) => !known.has(sample.healthSampleId));
        if (fresh.length === 0) return current;

        addedCount = fresh.length;
        const next = { ...current };
        rowsToPersist.length = 0;

        for (const sample of fresh) {
          const date = toDateKey(sample.loggedAt);
          // Prefer the section this app originally logged it under — it only
          // falls back to guessing from the time of day for samples from
          // another app (or logged before this round trip existed).
          const section = sample.section && sectionById(sections, sample.section)
            ? sample.section
            : sectionForNow(sections, sample.loggedAt);
          const entry: Entry = {
            id: `${Date.now()}-${sample.healthSampleId}`,
            name: sample.name,
            calories: sample.calories,
            carbs: sample.carbs,
            protein: sample.protein,
            fat: sample.fat,
            waterMl: sample.waterMl,
            section,
            loggedAt: sample.loggedAt.toISOString(),
            healthSampleId: sample.healthSampleId,
            source: sample.source,
            emoji: sample.source.kind === 'own' ? matchFoodEmoji(sample.name) : undefined,
          };

          const position = entriesForSection(next[date] ?? [], section).length;
          next[date] = [...(next[date] ?? []), entry];
          rowsToPersist.push({ date, entry, position });
        }

        return next;
      });

      if (rowsToPersist.length > 0) {
        void Promise.all(
          rowsToPersist.map(({ date, entry, position }) => insertEntry(date, entry, position)),
        ).catch(() => {});
      }

      return addedCount;
    },
    [importEntries, sections],
  );

  /**
   * Kept current without a ref subscribing to `entriesByDate` itself — the
   * effect below only needs to fire on `healthAvailable` changes (device
   * capability, essentially fixed for the app's lifetime), not on every entry.
   * Re-running it whenever `importFromHealth` is redefined would mean
   * refiring on every entry the import itself just added.
   */
  const importFromHealthRef = useRef(importFromHealth);
  useEffect(() => {
    importFromHealthRef.current = importFromHealth;
  }, [importFromHealth]);

  /**
   * Keeps Health entries flowing in on their own — independent of the
   * "Sync to Health" toggle (that one only governs writing out, not reading
   * back in). A full-history pull right on launch fills in anything logged
   * elsewhere that isn't in the local database yet. After that, two things
   * trigger a short catch-up: `useHealthKit`'s observer queries firing (the
   * primary path — covers a change from any source, including while
   * backgrounded, per its own doc comment) and the app coming back to the
   * foreground (a cheap belt-and-suspenders in case a particular observer
   * callback was missed), so nothing sits unseen until someone remembers to
   * tap "Import from Health". Gated on `dbLoaded` too — otherwise this could
   * race the local hydration effect above and dedupe against an empty log,
   * re-importing entries the database already has.
   */
  useEffect(() => {
    if (!healthAvailable || !dbLoaded) return;

    function catchUp(daysBack: number) {
      const start = addDays(startOfToday(), -daysBack);
      void importFromHealthRef.current({ start, end: new Date() });
    }

    catchUp(AUTO_IMPORT_FULL_DAYS_BACK);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') catchUp(AUTO_IMPORT_DAYS_BACK);
    });
    const unsubscribeHealthChange = onHealthChange(() => catchUp(AUTO_IMPORT_DAYS_BACK));

    return () => {
      appStateSubscription.remove();
      unsubscribeHealthChange();
    };
  }, [healthAvailable, dbLoaded, onHealthChange]);

  /**
   * Warms the icon cache for every third-party source Health has ever seen,
   * once, so a row for one of them already has its logo cached by the time
   * the user scrolls to it instead of popping in after a lookup.
   */
  useEffect(() => {
    if (!healthAvailable) return;

    void listKnownSources().then((sources) => {
      for (const source of sources) {
        if (source.bundleIdentifier === OWN_BUNDLE_ID) continue;
        void resolveSourceIconUrl(source.bundleIdentifier);
      }
    });
  }, [healthAvailable, listKnownSources]);

  const dropEntry = useCallback(
    (date: DateKey, id: string, section: string, index: number) => {
      const entry = entriesByDate[date]?.find((candidate) => candidate.id === id);
      let moved: Entry[] | undefined;

      setEntriesByDate((current) => {
        moved = moveEntry(current[date] ?? [], id, section, index);
        return { ...current, [date]: moved };
      });

      if (moved) {
        const destinationIds = entriesForSection(moved, section).map((candidate) => candidate.id);
        void reindexSection(date, section, destinationIds).catch(() => {});

        if (entry && entry.section !== section) {
          const sourceIds = entriesForSection(moved, entry.section).map((candidate) => candidate.id);
          void reindexSection(date, entry.section, sourceIds).catch(() => {});
        }
      }

      if (!entry || entry.section === section || !entry.healthSampleId) return;

      // HealthKit has no way to edit a correlation's metadata in place, so
      // keeping Health in sync with a section move means deleting the old
      // correlation and writing a fresh one — same food, same original
      // `loggedAt`, just tagged with the new section.
      unsyncEntry(entry.healthSampleId);

      void syncEntry({ ...entry, section }).then((healthSampleId) => {
        setEntriesByDate((current) => ({
          ...current,
          [date]: (current[date] ?? []).map((candidate) =>
            candidate.id === id ? { ...candidate, healthSampleId } : candidate,
          ),
        }));
      });
    },
    [entriesByDate, syncEntry, unsyncEntry],
  );

  const saveSection = useCallback(
    (section: Section) => {
      const index = sections.findIndex((candidate) => candidate.id === section.id);
      void upsertSection(section, index === -1 ? sections.length : index).catch(() => {});

      setSections((current) =>
        current.some((candidate) => candidate.id === section.id)
          ? current.map((candidate) => (candidate.id === section.id ? section : candidate))
          : [...current, section],
      );
    },
    [sections],
  );

  /** Deleting a section keeps its food — the entries fall back to the first one. */
  const removeSection = useCallback((id: string) => {
    setSections((current) => {
      const remaining = current.filter((section) => section.id !== id);
      if (remaining.length === 0) return current;

      const fallback = remaining[0].id;

      void deleteSectionRow(id)
        .then(() => reassignSectionEntries(id, fallback))
        .catch(() => {});

      setEntriesByDate((entries) =>
        Object.fromEntries(
          Object.entries(entries).map(([date, logged]) => [
            date,
            logged.map((entry) => (entry.section === id ? { ...entry, section: fallback } : entry)),
          ]),
        ),
      );

      return remaining;
    });
  }, []);

  const setSectionHidden = useCallback((id: string, hidden: boolean) => {
    void setSectionHiddenRow(id, hidden).catch(() => {});

    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, hidden } : section)),
    );
  }, []);

  const value = useMemo(
    () => ({
      sections,
      entriesByDate,
      entriesOn,
      addEntry,
      updateEntry,
      removeEntry,
      dropEntry,
      saveSection,
      removeSection,
      setSectionHidden,
      importFromHealth,
    }),
    [
      addEntry,
      updateEntry,
      dropEntry,
      entriesByDate,
      entriesOn,
      importFromHealth,
      removeEntry,
      removeSection,
      saveSection,
      sections,
      setSectionHidden,
    ],
  );

  return <FoodLogContext value={value}>{children}</FoodLogContext>;
}

export function useFoodLog(): FoodLog {
  const log = use(FoodLogContext);
  if (!log) throw new Error('useFoodLog must be used inside a FoodLogProvider');

  return log;
}
