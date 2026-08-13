/**
 * Theme store — Apple's iOS system palette.
 *
 * Apple deliberately does not publish guaranteed hex values for `UIColor`
 * system colors, since the rendered color depends on the trait environment
 * (appearance, contrast, vibrancy). These are the standard measured values for
 * the default light/dark environments, matching the HIG color roster:
 * https://developer.apple.com/design/human-interface-guidelines/color
 *
 * Prefer the semantic names (`label`, `separator`, `secondaryBackground`) over
 * the raw tints — they carry the intent and adapt per scheme.
 */

import { Platform } from 'react-native';

export type ColorScheme = 'light' | 'dark';

/** Raw iOS system tint colors, per appearance. */
const palette = {
  light: {
    red: '#FF3B30',
    orange: '#FF9500',
    yellow: '#FFCC00',
    green: '#34C759',
    mint: '#00C7BE',
    teal: '#30B0C7',
    cyan: '#32ADE6',
    blue: '#007AFF',
    indigo: '#5856D6',
    purple: '#AF52DE',
    pink: '#FF2D55',
    brown: '#A2845E',
    gray: '#8E8E93',
    gray2: '#AEAEB2',
    gray3: '#C7C7CC',
    gray4: '#D1D1D6',
    gray5: '#E5E5EA',
    gray6: '#F2F2F7',
  },
  dark: {
    red: '#FF453A',
    orange: '#FF9F0A',
    yellow: '#FFD60A',
    green: '#30D158',
    mint: '#63E6E2',
    teal: '#40C8E0',
    cyan: '#64D2FF',
    blue: '#0A84FF',
    indigo: '#5E5CE6',
    purple: '#BF5AF2',
    pink: '#FF375F',
    brown: '#AC8E68',
    gray: '#8E8E93',
    gray2: '#636366',
    gray3: '#48484A',
    gray4: '#3A3A3C',
    gray5: '#2C2C2E',
    gray6: '#1C1C1E',
  },
} as const;

export const Colors = {
  light: {
    ...palette.light,

    /** Text, in descending prominence. */
    label: '#000000',
    secondaryLabel: 'rgba(60, 60, 67, 0.6)',
    tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
    quaternaryLabel: 'rgba(60, 60, 67, 0.18)',
    placeholderText: 'rgba(60, 60, 67, 0.3)',

    /** Translucent fills for small shapes: bars, chips, input wells. */
    fill: 'rgba(120, 120, 128, 0.2)',
    secondaryFill: 'rgba(120, 120, 128, 0.16)',
    tertiaryFill: 'rgba(118, 118, 128, 0.12)',
    quaternaryFill: 'rgba(116, 116, 128, 0.08)',

    /** Surfaces, from furthest back to closest to the user. */
    background: '#FFFFFF',
    secondaryBackground: '#F2F2F7',
    tertiaryBackground: '#FFFFFF',
    groupedBackground: '#F2F2F7',
    secondaryGroupedBackground: '#FFFFFF',
    tertiaryGroupedBackground: '#F2F2F7',

    separator: 'rgba(60, 60, 67, 0.29)',
    opaqueSeparator: '#C6C6C8',

    /** Specular edge that keeps a glass surface legible on flat backgrounds. */
    glassBorder: 'rgba(255, 255, 255, 0.55)',
    glassShadow: '#000000',

    tint: palette.light.blue,
    accent: palette.light.green,
    warning: palette.light.orange,
    danger: palette.light.red,
  },
  dark: {
    ...palette.dark,

    label: '#FFFFFF',
    secondaryLabel: 'rgba(235, 235, 245, 0.6)',
    tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
    quaternaryLabel: 'rgba(235, 235, 245, 0.16)',
    placeholderText: 'rgba(235, 235, 245, 0.3)',

    fill: 'rgba(120, 120, 128, 0.36)',
    secondaryFill: 'rgba(120, 120, 128, 0.32)',
    tertiaryFill: 'rgba(118, 118, 128, 0.24)',
    quaternaryFill: 'rgba(118, 118, 128, 0.18)',

    background: '#000000',
    secondaryBackground: '#1C1C1E',
    tertiaryBackground: '#2C2C2E',
    groupedBackground: '#000000',
    secondaryGroupedBackground: '#1C1C1E',
    tertiaryGroupedBackground: '#2C2C2E',

    separator: 'rgba(84, 84, 88, 0.6)',
    opaqueSeparator: '#38383A',

    glassBorder: 'rgba(255, 255, 255, 0.22)',
    glassShadow: '#000000',

    tint: palette.dark.blue,
    accent: palette.dark.green,
    warning: palette.dark.orange,
    danger: palette.dark.red,
  },
} as const;

export type ColorName = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/** Apple's standard corner radii, for continuous-ish rounding. */
export const Radius = {
  small: 10,
  medium: 14,
  large: 20,
  pill: 999,
} as const;

/** Splits a `#rrggbb` theme color into its `r, g, b` components, for building an `rgba()` string against it. */
export function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}
