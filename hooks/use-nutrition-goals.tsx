import { createContext, use, useCallback, useMemo, useState } from 'react';

import { KVStore } from '@/hooks/kv-store';
import { DEFAULT_GOALS, Macro, MACROS, NutritionGoals } from '@/utils/entries';

const STORAGE_KEY = 'nutrition-goals';

type NutritionGoalsContextValue = {
  goals: NutritionGoals;
  setCalorieGoal: (calories: number) => void;
  setMacroGoal: (macro: Macro, grams: number) => void;
};

const NutritionGoalsContext = createContext<NutritionGoalsContextValue | null>(null);

/** A value read back from storage is untyped JSON — check its shape before trusting it as `NutritionGoals`. */
function isNutritionGoals(value: unknown): value is NutritionGoals {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.calories === 'number' &&
    MACROS.every((macro) => typeof candidate[macro] === 'number')
  );
}

function readStored(): NutritionGoals {
  try {
    const stored = KVStore.getItemSync(STORAGE_KEY);
    if (stored === null) return DEFAULT_GOALS;

    const parsed = JSON.parse(stored);
    if (isNutritionGoals(parsed)) return parsed;
  } catch {
    // No native store yet, or corrupt JSON — falls back to the defaults.
  }

  return DEFAULT_GOALS;
}

function persist(goals: NutritionGoals) {
  try {
    KVStore.setItemSync(STORAGE_KEY, JSON.stringify(goals));
  } catch {
    // Best effort — the goal still holds for the rest of this session.
  }
}

/**
 * Goals live here rather than in Settings: `DaySummary` reads them for every
 * day in the pager. Persisted via `KVStore` (same small-preferences store as
 * the theme) so they survive a reload — unlike the food log itself, which
 * stays in memory and rebuilds from Health instead.
 */
export function NutritionGoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<NutritionGoals>(readStored);

  const setCalorieGoal = useCallback((calories: number) => {
    setGoals((current) => {
      const next = { ...current, calories };
      persist(next);
      return next;
    });
  }, []);

  const setMacroGoal = useCallback((macro: Macro, grams: number) => {
    setGoals((current) => {
      const next = { ...current, [macro]: grams };
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ goals, setCalorieGoal, setMacroGoal }),
    [goals, setCalorieGoal, setMacroGoal],
  );

  return <NutritionGoalsContext value={value}>{children}</NutritionGoalsContext>;
}

export function useNutritionGoals(): NutritionGoalsContextValue {
  const context = use(NutritionGoalsContext);
  if (!context) throw new Error('useNutritionGoals must be used inside a NutritionGoalsProvider');

  return context;
}
