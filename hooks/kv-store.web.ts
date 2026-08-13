/**
 * Web counterpart to `kv-store.ts` — `localStorage` needs no bundling of its
 * own, unlike `expo-sqlite/kv-store`'s WASM build. See `kv-store.ts` for why.
 */
export const KVStore = {
  getItemSync(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItemSync(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore — e.g. private browsing with storage disabled.
    }
  },
};
