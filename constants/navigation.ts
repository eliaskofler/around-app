import type { NativeStackNavigationOptions } from 'expo-router';

/**
 * `top: 'hidden'` rather than `'soft'` — `soft` is UIKit's own blur-as-you-
 * scroll-under-the-header effect (`UIScrollEdgeEffect`), which is the native
 * blur we're replacing everywhere with a plain gradient. Left as `'soft'` it
 * shows up independently of `headerBlurEffect`/`headerBackground` the moment
 * content scrolls under the header.
 */
export const LIQUID_GLASS_SCROLL_EDGE: NonNullable<
  NativeStackNavigationOptions['scrollEdgeEffects']
> = {
  top: 'hidden',
};

/**
 * `headerBlurEffect` is deliberately left unset — every screen using these
 * options also supplies its own `headerBackground` (or a fully custom
 * `header`), and `react-native-screens` layers its native blur underneath
 * that regardless, fighting the plain gradient fade we draw instead.
 */
export const LIQUID_GLASS_HEADER_OPTIONS = {
  headerTransparent: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: 'transparent' },
  scrollEdgeEffects: LIQUID_GLASS_SCROLL_EDGE,
} satisfies NativeStackNavigationOptions;
