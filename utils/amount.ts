/**
 * Shared logic behind the grams/servings amount field — used by both the
 * barcode-scan confirm screen (`food-result.tsx`) and editing an entry that
 * was logged from a product (`edit-entry.tsx`). Framework-free, like the rest
 * of `utils/`.
 */

/** Whether a typed quantity counts a number of servings, or raw grams/millilitres. */
export type AmountUnit = 'serving' | 'raw';

export type UnitOption = { value: AmountUnit; label: string };

/** The unit choices for a product — "Serving (Xg)" only offered when the package names one. */
export function unitOptionsFor(servingGrams: number | undefined, isLiquid: boolean): UnitOption[] {
  return [
    ...(servingGrams
      ? [{ value: 'serving' as const, label: `Serving (${servingGrams} ${isLiquid ? 'ml' : 'g'})` }]
      : []),
    { value: 'raw' as const, label: isLiquid ? 'Milliliter' : 'Gram' },
  ];
}

/** Grams/millilitres a typed quantity+unit comes to. */
export function gramsForAmount(
  unit: AmountUnit,
  quantity: number,
  servingGrams: number | undefined,
): number {
  return unit === 'serving' && servingGrams ? quantity * servingGrams : quantity;
}

/** `1.5` -> `"1.5"`, `2` -> `"2"` — a quantity without float noise or a forced `.0`. */
export function formatQuantity(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/**
 * What a typed quantity becomes when the unit it's measured in changes —
 * converted so the underlying grams stay put (e.g. `250g` -> `5 servings` for
 * a 50g serving), rather than just resetting to a default.
 */
export function convertQuantity(
  quantity: number,
  from: AmountUnit,
  to: AmountUnit,
  servingGrams: number | undefined,
): number {
  if (from === to || !servingGrams || !Number.isFinite(quantity) || quantity <= 0) return quantity;
  return to === 'serving' ? quantity / servingGrams : quantity * servingGrams;
}
