import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type GlassSurfaceProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  isInteractive?: boolean;
}>;

/**
 * Liquid Glass on iOS 26+, a translucent stand-in everywhere else (`GlassView`
 * degrades to a bare `View` off-platform).
 *
 * Both paths draw a hairline specular edge and a soft shadow: over a flat
 * background there is nothing for the glass to refract, so without them the
 * surface all but disappears.
 *
 * Do not clip this with `overflow: 'hidden'` or drop it below opacity 1 —
 * the first kills the shadow, the second breaks glass rendering.
 */
export function GlassSurface({ children, style, isInteractive = true }: GlassSurfaceProps) {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  const edge: ViewStyle = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassBorder,
    shadowColor: theme.glassShadow,
    shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView style={[style, edge]} glassEffectStyle="regular" isInteractive={isInteractive}>
        {children}
      </GlassView>
    );
  }

  const fill = colorScheme === 'dark' ? styles.fallbackDark : styles.fallbackLight;

  return <View style={[style, edge, fill]}>{children}</View>;
}

const styles = StyleSheet.create({
  fallbackLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  fallbackDark: {
    backgroundColor: 'rgba(40, 42, 44, 0.72)',
  },
});
