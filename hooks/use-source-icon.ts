import { useEffect, useState } from 'react';

import { KVStore } from '@/hooks/kv-store';

/** Where a resolved (or failed) lookup for a bundle id is cached. */
function cacheKey(bundleIdentifier: string): string {
  return `source-icon:${bundleIdentifier}`;
}

/**
 * Looks up a third-party app's icon by its bundle id via the iTunes Lookup
 * API and caches the resolved artwork URL on-device via `KVStore`, so a
 * bundle id is only ever looked up once per install. A cached empty string
 * means "looked up before, nothing found" — a negative cache so an app with
 * no App Store listing doesn't get hit again on every render. The actual
 * image bytes are cached separately, on disk, by `expo-image` once a caller
 * renders the resolved URL — nothing here touches the filesystem directly.
 */
export async function resolveSourceIconUrl(bundleIdentifier: string): Promise<string | undefined> {
  try {
    const cached = KVStore.getItemSync(cacheKey(bundleIdentifier));
    if (cached !== null) return cached || undefined;
  } catch {
    // Fall through to a fresh lookup — the cache just isn't readable this time.
  }

  let url = '';

  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleIdentifier)}`,
    );
    const json = await response.json();
    const result = json?.results?.[0];

    url = result?.artworkUrl512 ?? result?.artworkUrl100 ?? result?.artworkUrl60 ?? '';
  } catch {
    // Leave `url` empty — cached below as a negative result, same as no listing found.
  }

  try {
    KVStore.setItemSync(cacheKey(bundleIdentifier), url);
  } catch {
    // Best effort — the lookup result still holds for the rest of this session.
  }

  return url || undefined;
}

/** Component-friendly wrapper around `resolveSourceIconUrl`. */
export function useSourceIconUrl(bundleIdentifier: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void resolveSourceIconUrl(bundleIdentifier).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [bundleIdentifier]);

  return url;
}
