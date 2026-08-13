/**
 * Thin client for the Open Food Facts API — barcode lookup and free-text
 * search, both reduced to the same `FoodProduct` shape the barcode scanner
 * and search screens render. Framework-free, like the rest of `utils/`.
 */

const USER_AGENT = 'AroundFitness/1.0 (https://github.com/eliaskofler/around-app)';
const REQUEST_TIMEOUT_MS = 10_000;

export type FoodProduct = {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  /** Parsed from the product's `serving_size` text, when it names a weight or volume. */
  servingGrams?: number;
  /** Whether that serving was named in a volume unit (`l`/`ml`) rather than a weight one — a `ml` product's amount counts toward water intake. */
  servingUnit?: 'g' | 'ml';
  /** The raw serving text (e.g. "1 bar (40 g)"), shown as-is next to the parsed amount. */
  servingLabel?: string;
  /** Per 100 g (or 100 ml for liquids) — what every scaled amount is computed from. */
  per100g: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
};

const PRODUCT_FIELDS =
  'code,product_name,brands,image_front_small_url,image_small_url,serving_size,nutriments';

/** A request that gives up after `REQUEST_TIMEOUT_MS` rather than hanging on a bad connection. */
async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** A serving's amount and unit, parsed out of a serving string like "1 bar (40 g)" or "500 ml". */
type ParsedServing = { grams: number; unit: 'g' | 'ml' };

/** Grams (or millilitres, for a volume-denominated serving) named in a serving string — nutrition scaling treats `ml` as `g`, close enough for nutrition labels, but the unit itself is kept so a liquid product can be logged as water. */
function parseServing(servingSize: unknown): ParsedServing | undefined {
  if (typeof servingSize !== 'string') return undefined;

  const match = servingSize.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b/i);
  if (!match) return undefined;

  const amount = Number.parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  const unit = match[2].toLowerCase();
  const isVolume = unit === 'l' || unit === 'ml';
  const multiplier = unit === 'kg' || unit === 'l' ? 1000 : 1;

  return { grams: Math.round(amount * multiplier), unit: isVolume ? 'ml' : 'g' };
}

/** `product["energy-kcal_100g"]`, falling back to converting kJ when only that's given. */
function caloriesPer100g(nutriments: Record<string, unknown>): number {
  const kcal = nutriments['energy-kcal_100g'];
  if (typeof kcal === 'number') return kcal;

  const kj = nutriments['energy_100g'];
  if (typeof kj === 'number') return kj / 4.184;

  return 0;
}

function numberField(nutriments: Record<string, unknown>, key: string): number {
  const value = nutriments[key];
  return typeof value === 'number' ? value : 0;
}

/** The product API returns `brands` as a comma-separated string; search-a-licious returns an array. Handle both. */
function firstBrand(brands: unknown): string | undefined {
  if (Array.isArray(brands)) {
    const first = brands.find((b) => typeof b === 'string' && b.trim().length > 0);
    return typeof first === 'string' ? first.trim() : undefined;
  }
  if (typeof brands === 'string' && brands.trim().length > 0) {
    return brands.split(',')[0].trim();
  }
  return undefined;
}

/** `null` when the API has nothing under that barcode, or per-100g nutrition is missing entirely. */
function toProduct(raw: unknown): FoodProduct | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const product = raw as Record<string, unknown>;

  const barcode = product.code;
  const name = product.product_name;
  if (typeof barcode !== 'string' || typeof name !== 'string' || name.trim().length === 0) {
    return null;
  }

  const nutriments =
    typeof product.nutriments === 'object' && product.nutriments !== null
      ? (product.nutriments as Record<string, unknown>)
      : {};

  const per100g = {
    calories: Math.round(caloriesPer100g(nutriments)),
    carbs: numberField(nutriments, 'carbohydrates_100g'),
    protein: numberField(nutriments, 'proteins_100g'),
    fat: numberField(nutriments, 'fat_100g'),
  };
  if (per100g.calories <= 0) return null;

  const servingSize = product.serving_size;
  const serving = parseServing(servingSize);

  return {
    barcode,
    name: name.trim(),
    brand: firstBrand(product.brands),
    imageUrl:
      (typeof product.image_front_small_url === 'string' && product.image_front_small_url) ||
      (typeof product.image_small_url === 'string' && product.image_small_url) ||
      undefined,
    servingGrams: serving?.grams,
    servingUnit: serving?.unit,
    servingLabel: typeof servingSize === 'string' ? servingSize : undefined,
    per100g,
  };
}

/** Looks up one product by its scanned barcode. `null` if Open Food Facts has no (usable) entry for it. */
export async function lookupBarcode(barcode: string): Promise<FoodProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${PRODUCT_FIELDS}`;
  const json = await fetchJson(url);
  if (typeof json !== 'object' || json === null) return null;

  const body = json as Record<string, unknown>;
  if (body.status !== 1) return null;

  return toProduct(body.product);
}

/**
 * Free-text search, for when a scanned barcode isn't in the database — the results let the user
 * pick which product actually matches.
 *
 * Uses Open Food Facts' full-text search engine (search-a-licious, at `search.openfoodfacts.org`)
 * rather than the legacy `/cgi/search.pl`: the legacy endpoint's matching is inconsistent on case
 * and word order (e.g. "nutella" finding nothing while "Nutella" finds plenty), where this one is
 * relevance-ranked and case-insensitive.
 */
export async function searchFoodByName(query: string): Promise<FoodProduct[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const params = new URLSearchParams({
    q: trimmed,
    page_size: '20',
    fields: PRODUCT_FIELDS,
  });
  const json = await fetchJson(`https://search.openfoodfacts.org/search?${params}`);
  if (typeof json !== 'object' || json === null) return [];

  const body = json as Record<string, unknown>;
  const hits = Array.isArray(body.hits) ? body.hits : [];

  const seen = new Set<string>();
  const results: FoodProduct[] = [];
  for (const raw of hits) {
    const product = toProduct(raw);
    if (!product || seen.has(product.barcode)) continue;
    seen.add(product.barcode);
    results.push(product);
  }

  return results;
}

/** What `grams` of `product` comes to — rounded, since a fractional calorie or gram reads as false precision. */
export function scaleProduct(
  product: Pick<FoodProduct, 'per100g'>,
  grams: number,
): { calories: number; carbs: number; protein: number; fat: number } {
  const factor = grams / 100;

  return {
    calories: Math.round(product.per100g.calories * factor),
    carbs: Math.round(product.per100g.carbs * factor),
    protein: Math.round(product.per100g.protein * factor),
    fat: Math.round(product.per100g.fat * factor),
  };
}
