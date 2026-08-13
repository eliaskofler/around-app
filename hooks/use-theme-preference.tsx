import { createContext, use, useState } from 'react';
import { Appearance } from 'react-native';

import { KVStore } from '@/hooks/kv-store';

export type ThemePreference = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'theme-preference';

function toNativeScheme(preference: ThemePreference) {
  return preference === 'auto' ? 'unspecified' : preference;
}

/**
 * `Appearance.setColorScheme` is iOS/Android-only — `react-native-web`'s
 * `Appearance` shim doesn't implement it (it only ever reads the OS media
 * query), so calling it unguarded throws on web. There the day is left
 * following the system scheme; only `preference` (for the button's own
 * icon) still tracks the user's choice.
 */
function applyNativeScheme(preference: ThemePreference) {
  if (typeof Appearance.setColorScheme !== 'function') return;

  Appearance.setColorScheme(toNativeScheme(preference));
}

function readStored(): ThemePreference {
  try {
    const stored = KVStore.getItemSync(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  } catch {
    // No native store yet (e.g. first launch, or off-platform) — falls back to auto.
  }

  return 'auto';
}

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

/**
 * Overrides the app's appearance through React Native's own `Appearance` API
 * — the real per-app trait-collection override iOS exposes — rather than a
 * hand-rolled color swap that native pieces (the status bar, the inline
 * calendar, glass surfaces) wouldn't pick up. `useColorScheme` everywhere
 * else in the app keeps working unmodified: it already reflects whatever
 * `Appearance.setColorScheme` last set.
 */
export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = readStored();
    applyNativeScheme(stored);
    return stored;
  });

  function setPreference(next: ThemePreference) {
    applyNativeScheme(next);
    setPreferenceState(next);

    try {
      KVStore.setItemSync(STORAGE_KEY, next);
    } catch {
      // Best effort — the choice still holds for the rest of this session.
    }
  }

  return <ThemePreferenceContext value={{ preference, setPreference }}>{children}</ThemePreferenceContext>;
}

export function useThemePreference(): ThemePreferenceContextValue {
  const context = use(ThemePreferenceContext);
  if (!context) throw new Error('useThemePreference must be used inside a ThemePreferenceProvider');

  return context;
}
