/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { ColorName, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(props: { light?: string; dark?: string }, colorName: ColorName) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  return colorFromProps ?? Colors[theme][colorName];
}
