import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hexToRgb } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const HEADER_HEIGHT = 52;

type NativeHeaderGradientBlurProps = {
  /**
   * Overrides the default `insets.top + 52` sizing, tuned for the day's own
   * full-height header. A shorter bar (a sheet's, say) needs a shorter fade —
   * left at the default it washes out far more than the bar it sits behind.
   */
  height?: number;
};

export function NativeHeaderGradientBlur({ height: heightProp }: NativeHeaderGradientBlurProps = {}) {
  const { top } = useSafeAreaInsets();
  const theme = useTheme();

  const height = heightProp ?? top + HEADER_HEIGHT;
  const rgb = hexToRgb(theme.groupedBackground);

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        `rgba(${rgb}, 1)`,
        `rgba(${rgb}, 0.95)`,
        `rgba(${rgb}, 0.75)`,
        `rgba(${rgb}, 0.4)`,
        `rgba(${rgb}, 0)`,
      ]}
      locations={[0, 0.4, 0.65, 0.85, 1]}
      style={[styles.container, { height }]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // No zIndex: this has to paint behind whatever else is in the header, so
    // it relies on being mounted first rather than stacked above siblings.
  },
});
