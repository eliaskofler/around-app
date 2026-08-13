import {
  deleteObjects,
  enableBackgroundDelivery,
  disableAllBackgroundDelivery,
  queryCorrelationSamples,
  queryStatisticsForQuantity,
  querySources,
  requestAuthorization,
  saveCorrelationSample,
  subscribeToChanges,
  UpdateFrequency,
  useIsHealthDataAvailable,
} from '@kingstinct/react-native-healthkit';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { KVStore } from '@/hooks/kv-store';
import { Entry, EntrySource, ImportedFoodSample } from '@/utils/entries';

const STORAGE_KEY = 'health-sync-enabled';

/** Matches `ios.bundleIdentifier` in app.json — used to tell our own writes apart from every other source. */
export const OWN_BUNDLE_ID = 'com.ripledd.around';

const ENERGY_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryEnergyConsumed' as const;
const CARBS_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryCarbohydrates' as const;
const PROTEIN_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryProtein' as const;
const FAT_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryFatTotal' as const;
const WATER_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryWater' as const;

/** Active Energy Burned — read-only, there's nothing here for this app to write. */
const BURNED_ENERGY_IDENTIFIER = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;

/** A logged entry writes one `HKCorrelationTypeIdentifierFood` bundling these. */
const FOOD_TYPE = 'HKCorrelationTypeIdentifierFood' as const;

/**
 * Custom metadata key a synced entry's section id is stashed under, so a
 * later import can put it back in the meal the user actually chose instead
 * of guessing from the time of day — see `sectionForNow`, the fallback for
 * anything logged by another app (or before this key existed).
 */
const SECTION_METADATA_KEY = 'AroundMealSection' as const;

/** What a logged entry writes to Health — asked for up front, all at once. */
const WRITE_IDENTIFIERS = [
  ENERGY_IDENTIFIER,
  CARBS_IDENTIFIER,
  PROTEIN_IDENTIFIER,
  FAT_IDENTIFIER,
  WATER_IDENTIFIER,
] as const;

/**
 * Read access asked for alongside write — covers syncing out, importing in,
 * and reading Active Energy Burned (write-less, so it's only ever read). The
 * correlation type itself (`FOOD_TYPE`) deliberately isn't in here: HealthKit
 * authorization is for concrete quantity/category types, not correlations —
 * a correlation just bundles samples you already have access to, and asking
 * for it directly crashed the native authorization call outright (a
 * Swift-level trap, not a JS error try/catch can stop).
 */
const READ_IDENTIFIERS = [...WRITE_IDENTIFIERS, BURNED_ENERGY_IDENTIFIER] as const;

/**
 * Pulls one quantity (calories, or a macro's grams) out of a food
 * correlation's objects — a mix of quantity and category samples, so this
 * reads loosely rather than importing the library's own union type for it.
 */
function quantityIn(objects: readonly Record<string, unknown>[], identifier: string): number {
  const match = objects.find((object) => object.quantityType === identifier);
  const quantity = match?.quantity;

  return typeof quantity === 'number' ? Math.round(quantity) : 0;
}

/** Syncing out defaults on — `null` means the user has never touched the Settings toggle. */
function readEnabled(): boolean {
  try {
    const stored = KVStore.getItemSync(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

/**
 * Asks HealthKit for read+write access to the four nutrition types. Several
 * things want this on mount now (the initial Health import, and the
 * background-delivery effect below) — single-flighted so they always await
 * the same underlying native call rather than firing `requestAuthorization`
 * concurrently, which HealthKit's Swift bridging does not tolerate well (a
 * native trap neither JS nor Swift `try/catch` can stop, the same class of
 * crash as the correlation-type issue noted on `READ_IDENTIFIERS` above).
 */
let authorizationRequest: Promise<void> | null = null;

async function askForAuthorization(): Promise<void> {
  if (!authorizationRequest) {
    authorizationRequest = requestAuthorization({
      toShare: WRITE_IDENTIFIERS,
      toRead: READ_IDENTIFIERS,
    })
      .catch(() => {
        // Health access just won't work this session — nothing else here depends on it.
      })
      .then(() => undefined);
  }

  return authorizationRequest;
}

type HealthKitContextValue = {
  /** False on Android, web, and any iOS device without Health (e.g. some iPads). */
  isAvailable: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** Writes one logged entry's energy and macros to Health, as a single food correlation, at its own `loggedAt`. */
  syncEntry: (entry: Entry) => Promise<string | undefined>;
  /** Removes whatever `syncEntry` wrote for an entry, given the uuid it returned. */
  unsyncEntry: (healthSampleId: string) => void;
  /** Reads back every food logged in Health — by this app or any other — in a date range. */
  importEntries: (range: { start: Date; end: Date }) => Promise<ImportedFoodSample[]>;
  /** Total Active Energy Burned (kcal) across all sources in a date range. */
  getBurnedCalories: (range: { start: Date; end: Date }) => Promise<number>;
  /** Every app (besides this one) that has ever written a nutrition sample, unioned across the four types. */
  listKnownSources: () => Promise<{ name: string; bundleIdentifier: string }[]>;
  /** Fires whenever an observer query picks up a change from any source. Returns an unsubscribe function. */
  onHealthChange: (callback: () => void) => () => void;
};

const HealthKitContext = createContext<HealthKitContextValue | null>(null);

/**
 * Mirrors logged food into Apple Health, and reads it back. Writing out is
 * off by default — the user opts in from Settings, which is also what
 * triggers the system prompt for write access. Reading, by contrast, runs on
 * its own: `FoodLogProvider` calls `importEntries` right on launch (see its
 * own doc comment) so the log rebuilds from Health without anyone having to
 * ask, which means the system's read-access prompt fires on first launch
 * rather than waiting on an explicit tap. On top of that, this provider
 * itself keeps one `HKObserverQuery` (`subscribeToChanges`) running per
 * nutrition type, backed by background delivery, and fans each change out
 * through `onHealthChange` — `FoodLogProvider` uses that to catch up from
 * any source (this app, Health, a watch, another app) without waiting for
 * the next foreground. `@kingstinct/react-native-healthkit` degrades to
 * inert stubs off-iOS, so nothing here needs its own platform guard —
 * `isAvailable` is false there and both the mount-time import and the
 * observer queries are no-ops.
 */
export function HealthKitProvider({ children }: { children: React.ReactNode }) {
  const isAvailable = useIsHealthDataAvailable() ?? false;
  const [enabled, setEnabledState] = useState(readEnabled);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);

    try {
      KVStore.setItemSync(STORAGE_KEY, next ? 'true' : 'false');
    } catch {
      // Best effort — the choice still holds for the rest of this session.
    }

    // HealthKit only ever prompts once per type; asking again after that
    // just re-reads the (possibly still-denied) status, which is harmless.
    if (next) void askForAuthorization();
  }, []);

  const syncEntry = useCallback(
    async (entry: Entry): Promise<string | undefined> => {
      if (!enabled || !isAvailable) return undefined;

      const loggedAt = new Date(entry.loggedAt);
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
        (entry.waterMl ?? 0) > 0 && {
          quantityType: WATER_IDENTIFIER,
          quantity: entry.waterMl ?? 0,
          unit: 'mL',
          startDate: loggedAt,
          endDate: loggedAt,
        },
      ].filter((sample) => sample !== false);

      if (samples.length === 0) return undefined;

      try {
        const correlation = await saveCorrelationSample(FOOD_TYPE, samples, loggedAt, loggedAt, {
          HKFoodType: entry.name,
          [SECTION_METADATA_KEY]: entry.section,
        });

        return correlation?.uuid;
      } catch {
        // The entry is already logged locally either way — Health is a mirror of it.
        return undefined;
      }
    },
    [enabled, isAvailable],
  );

  const unsyncEntry = useCallback((healthSampleId: string) => {
    deleteObjects(FOOD_TYPE, { uuid: healthSampleId }).catch(() => {
      // Best effort — nothing locally depends on the Health-side delete succeeding.
    });
  }, []);

  const importEntries = useCallback(
    async (range: { start: Date; end: Date }): Promise<ImportedFoodSample[]> => {
      if (!isAvailable) return [];

      // Import works independently of the sync-out toggle, so it has to ask
      // for read access itself rather than relying on `setEnabled` having run.
      await askForAuthorization();

      try {
        const correlations = await queryCorrelationSamples(FOOD_TYPE, {
          limit: 0,
          ascending: true,
          filter: { date: { startDate: range.start, endDate: range.end } },
        });

        return correlations.map((correlation) => {
          const objects = correlation.objects as unknown as Record<string, unknown>[];
          const section = correlation.metadata?.[SECTION_METADATA_KEY];
          const sourceInfo = correlation.sourceRevision.source;
          const source: EntrySource =
            sourceInfo.bundleIdentifier === OWN_BUNDLE_ID
              ? { kind: 'own' }
              : {
                  kind: 'external',
                  name: sourceInfo.name,
                  bundleIdentifier: sourceInfo.bundleIdentifier,
                };

          return {
            healthSampleId: correlation.uuid,
            loggedAt: correlation.startDate,
            name: correlation.metadata?.HKFoodType ?? 'Imported Food',
            calories: quantityIn(objects, ENERGY_IDENTIFIER),
            carbs: quantityIn(objects, CARBS_IDENTIFIER),
            protein: quantityIn(objects, PROTEIN_IDENTIFIER),
            fat: quantityIn(objects, FAT_IDENTIFIER),
            waterMl: quantityIn(objects, WATER_IDENTIFIER) || undefined,
            section: typeof section === 'string' ? section : undefined,
            source,
          };
        });
      } catch {
        return [];
      }
    },
    [isAvailable],
  );

  const getBurnedCalories = useCallback(
    async (range: { start: Date; end: Date }): Promise<number> => {
      if (!isAvailable) return 0;

      // Read-only, but still needs the same authorization round trip as import.
      await askForAuthorization();

      try {
        const result = await queryStatisticsForQuantity(BURNED_ENERGY_IDENTIFIER, ['cumulativeSum'], {
          filter: { date: { startDate: range.start, endDate: range.end } },
          unit: 'kcal',
        });

        return Math.round(result.sumQuantity?.quantity ?? 0);
      } catch {
        return 0;
      }
    },
    [isAvailable],
  );

  /** Unions `querySources` across the four nutrition types — every app that has ever written one of them. */
  const listKnownSources = useCallback(async (): Promise<
    { name: string; bundleIdentifier: string }[]
  > => {
    if (!isAvailable) return [];

    try {
      const lists = await Promise.all(WRITE_IDENTIFIERS.map((identifier) => querySources(identifier)));
      const byBundleId = new Map<string, { name: string; bundleIdentifier: string }>();

      for (const sources of lists) {
        for (const source of sources) {
          byBundleId.set(source.bundleIdentifier, {
            name: source.name,
            bundleIdentifier: source.bundleIdentifier,
          });
        }
      }

      return [...byBundleId.values()];
    } catch {
      return [];
    }
  }, [isAvailable]);

  /** Listeners registered via `onHealthChange`, fired whenever any observer query below picks up a change. */
  const changeListeners = useRef(new Set<() => void>()).current;

  const onHealthChange = useCallback(
    (callback: () => void) => {
      changeListeners.add(callback);
      return () => {
        changeListeners.delete(callback);
      };
    },
    [changeListeners],
  );

  /**
   * Keeps Health entries flowing in continuously rather than only on manual
   * import or app foreground: one `HKObserverQuery` per nutrition type (via
   * `subscribeToChanges`), backed by `enableBackgroundDelivery` so iOS can
   * wake the app for a change from any source, including while backgrounded
   * (the `background-delivery` entitlement this needs is set by the
   * `@kingstinct/react-native-healthkit` config plugin in app.json).
   */
  useEffect(() => {
    if (!isAvailable) return;

    let cancelled = false;
    const subscriptions: { remove: () => void }[] = [];

    (async () => {
      await askForAuthorization();
      if (cancelled) return;

      for (const identifier of WRITE_IDENTIFIERS) {
        try {
          await enableBackgroundDelivery(identifier, UpdateFrequency.immediate);
        } catch {
          // Background delivery just won't wake the app for this type — the
          // foreground catch-up still covers it.
        }
        if (cancelled) return;

        subscriptions.push(
          subscribeToChanges(identifier, () => {
            changeListeners.forEach((callback) => callback());
          }),
        );
      }
    })();

    return () => {
      cancelled = true;
      subscriptions.forEach((subscription) => subscription.remove());
      disableAllBackgroundDelivery().catch(() => {
        // Nothing locally depends on this succeeding — the app is unmounting anyway.
      });
    };
  }, [changeListeners, isAvailable]);

  const value = useMemo(
    () => ({
      isAvailable,
      enabled,
      setEnabled,
      syncEntry,
      unsyncEntry,
      importEntries,
      getBurnedCalories,
      listKnownSources,
      onHealthChange,
    }),
    [
      enabled,
      isAvailable,
      setEnabled,
      syncEntry,
      unsyncEntry,
      importEntries,
      getBurnedCalories,
      listKnownSources,
      onHealthChange,
    ],
  );

  return <HealthKitContext value={value}>{children}</HealthKitContext>;
}

export function useHealthKit(): HealthKitContextValue {
  const context = use(HealthKitContext);
  if (!context) throw new Error('useHealthKit must be used inside a HealthKitProvider');

  return context;
}
