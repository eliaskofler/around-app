import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * React Native's `ColorSchemeName` also includes `'unspecified'`, which none of
 * our themes are keyed by. Narrow it to the two schemes the app actually has.
 */
export function useColorScheme(): 'light' | 'dark' {
  return useRNColorScheme() === 'dark' ? 'dark' : 'light';
}
