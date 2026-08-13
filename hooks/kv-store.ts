import { Storage } from 'expo-sqlite/kv-store';

/**
 * Tiny synchronous key-value store for small user preferences (a handful of
 * strings) — not the food log itself, which stays in memory on purpose.
 * Native only: `expo-sqlite/kv-store` pulls in a WASM build on web that
 * Metro can't resolve out of the box, so the web build gets its own
 * `localStorage`-backed implementation in `kv-store.web.ts`.
 */
export const KVStore = {
  getItemSync: (key: string) => Storage.getItemSync(key),
  setItemSync: (key: string, value: string) => Storage.setItemSync(key, value),
};
