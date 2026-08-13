import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The whole color set for the active appearance. Use this when a component
 * needs several colors; `useThemeColor` is for one-off lookups with overrides.
 */
export function useTheme() {
  return Colors[useColorScheme()];
}
