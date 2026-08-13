import { DateKey } from '@/utils/date';

export type Macro = 'carbs' | 'protein' | 'fat';

/**
 * Snapshot of the Open Food Facts product an entry was logged from, plus the
 * amount actually picked — lets editing rescale by amount again instead of
 * falling back to typing raw calories/macros. Not written to Health, so an
 * entry rebuilt from a Health re-import loses it, same as it loses everything
 * else Health's schema has no room for.
 */
export type EntryProduct = {
  per100g: { calories: number; carbs: number; protein: number; fat: number };
  servingGrams?: number;
  servingUnit?: 'g' | 'ml';
  servingLabel?: string;
  amountUnit: 'serving' | 'raw';
  amountQuantity: number;
};

/** Which app a sample in Health actually came from — ours, or someone else's. */
export type EntrySource =
  | { kind: 'own' }
  | { kind: 'external'; name: string; bundleIdentifier: string };

export type Entry = {
  id: string;
  name: string;
  calories: number;
  /** Grams of each macro — zero when the entry was logged without them. */
  carbs: number;
  protein: number;
  fat: number;
  /** Id of the section of the day this was logged under. */
  section: string;
  /** Milliliters of water this entry counts toward the day's water intake — undefined/zero for entries that don't track water. */
  waterMl?: number;
  /**
   * When this was actually eaten (ISO timestamp), kept so a later section
   * move can re-sync Health at the same time rather than "now". A string
   * rather than a `Date` — `Entry` flows into gesture-handler worklets via
   * the drag machinery, and Reanimated can't copy a `Date` across that
   * boundary.
   */
  loggedAt: string;
  /** Uuid of the Health food correlation this entry was mirrored into, if any. */
  healthSampleId?: string;
  /** Undefined (as well as `{ kind: 'own' }`) means this app's own entry — entries logged before this field existed default to that. */
  source?: EntrySource;
  /** Only meaningful for an own-app entry — which emoji its row shows, matched once at log time. */
  emoji?: string;
  /** Open Food Facts product photo, when this was logged from a barcode scan or food search. */
  imageUrl?: string;
  /** Present when this was logged from a barcode scan or food search — lets editing rescale by amount. */
  product?: EntryProduct;
};

export type EntryDraft = Omit<Entry, 'id' | 'loggedAt' | 'source' | 'emoji'>;

/** A food logged in Health — by this app or any other — before it becomes an `Entry`. */
export type ImportedFoodSample = {
  healthSampleId: string;
  loggedAt: Date;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  /** The section id this app originally logged it under, if it was the one that wrote it. */
  section?: string;
  source: EntrySource;
  waterMl?: number;
};

export type EntriesByDate = Record<DateKey, Entry[]>;

export const DAILY_GOAL = 2000;

/** Macro goals are a split of the calorie goal, the way most trackers do it. */
const MACRO_SPLIT: Record<Macro, number> = { carbs: 0.5, protein: 0.2, fat: 0.3 };
const KCAL_PER_GRAM: Record<Macro, number> = { carbs: 4, protein: 4, fat: 9 };

export const MACROS: readonly Macro[] = ['carbs', 'protein', 'fat'];

export const MACRO_LABELS: Record<Macro, string> = {
  carbs: 'Carbs',
  protein: 'Protein',
  fat: 'Fat',
};

/** What a set of macros comes to in calories — 4/4/9 per gram. */
export function caloriesFromMacros(grams: Record<Macro, number>): number {
  return MACROS.reduce((sum, macro) => sum + grams[macro] * KCAL_PER_GRAM[macro], 0);
}

/**
 * Anything inside this much of what a set of macros comes to is treated as
 * the same number — grams are whole numbers, so a macro total can land a
 * little off a typed calorie figure even when the two agree.
 */
const CALORIE_TOLERANCE = 10;
const CALORIE_TOLERANCE_SHARE = 0.05;

/** Whether `typed` calories disagree with what the macros actually come to. */
export function caloriesMismatch(typed: number, fromMacros: number): boolean {
  if (!(typed > 0) || !(fromMacros > 0)) return false;

  const tolerance = Math.max(CALORIE_TOLERANCE, Math.round(fromMacros * CALORIE_TOLERANCE_SHARE));
  return Math.abs(typed - fromMacros) > tolerance;
}

/** Grams of `macro` that make up `percent`% of `calories`. */
export function gramsFromPercent(macro: Macro, percent: number, calories: number): number {
  return Math.round((calories * (percent / 100)) / KCAL_PER_GRAM[macro]);
}

/** What `grams` of `macro` comes to, as a percent of `calories`. */
export function percentFromGrams(macro: Macro, grams: number, calories: number): number {
  return calories > 0 ? Math.round(((grams * KCAL_PER_GRAM[macro]) / calories) * 100) : 0;
}

/** The day's goal for `macro`, in grams. */
export function macroGoal(macro: Macro, goal: number = DAILY_GOAL): number {
  return Math.round((goal * MACRO_SPLIT[macro]) / KCAL_PER_GRAM[macro]);
}

export type NutritionGoals = {
  calories: number;
} & Record<Macro, number>;

/** What a fresh install starts with — the macros split `DAILY_GOAL` the usual way. */
export const DEFAULT_GOALS: NutritionGoals = {
  calories: DAILY_GOAL,
  carbs: macroGoal('carbs'),
  protein: macroGoal('protein'),
  fat: macroGoal('fat'),
};

export function totalCalories(entries: Entry[]): number {
  return entries.reduce((sum, entry) => sum + entry.calories, 0);
}

export function totalMacro(entries: Entry[], macro: Macro): number {
  return entries.reduce((sum, entry) => sum + entry[macro], 0);
}

export function totalWater(entries: Entry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.waterMl ?? 0), 0);
}

export function entriesForSection(entries: Entry[], section: string): Entry[] {
  return entries.filter((entry) => entry.section === section);
}

/**
 * Drops `id` into `section` at `index`, where `index` counts slots in the list
 * as it is drawn — so for a move inside the same section it still includes the
 * entry being dragged, and every later slot is one too far.
 */
export function moveEntry(entries: Entry[], id: string, section: string, index: number): Entry[] {
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) return entries;

  const others = entries.filter((candidate) => candidate.id !== id);
  const destination = others.filter((candidate) => candidate.section === section);

  const from = entries.filter((candidate) => candidate.section === section).indexOf(entry);
  const shifted = entry.section === section && index > from ? index - 1 : index;
  const at = Math.min(Math.max(shifted, 0), destination.length);

  if (entry.section === section && at === from) return entries;

  destination.splice(at, 0, { ...entry, section });

  // Only the order within a section is ever read back, so the untouched
  // sections can keep their relative order and the rebuilt one can go last.
  return [...others.filter((candidate) => candidate.section !== section), ...destination];
}
