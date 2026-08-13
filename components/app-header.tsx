import { AndroidSymbol, SFSymbol, SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass-surface';
import { NativeHeaderGradientBlur } from '@/components/header-gradient-blur';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemePreference, useThemePreference } from '@/hooks/use-theme-preference';

/** The controls themselves. */
const HEADER_HEIGHT = 44;

/** What the header covers below the status bar — the controls and their room. */
export const HEADER_BAR_HEIGHT = HEADER_HEIGHT + 16;

/** What tapping the appearance button switches to next. */
const NEXT_THEME_PREFERENCE: Record<ThemePreference, ThemePreference> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto',
};

const THEME_PREFERENCE_ICON: Record<ThemePreference, { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol }> = {
  auto: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' },
  light: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  dark: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
};

const THEME_PREFERENCE_LABEL: Record<ThemePreference, string> = {
  auto: 'Automatic appearance',
  light: 'Light appearance',
  dark: 'Dark appearance',
};

type AppHeaderProps = {
  /** The day being viewed — "Today", "Yesterday", "Aug 12"… */
  dayLabel: string;
  onPressDay?: () => void;
  onPressSettings?: () => void;
};

/**
 * The stack's header for the day: a centered day pill flanked by two separate
 * glass buttons. Each is its own glass surface so they read as distinct
 * controls.
 *
 * Rendered as the navigator's `header` with `headerTransparent`, so the day
 * scrolls under all three and this view sizes itself — the navigator takes
 * whatever height we lay out here rather than imposing one. That is also why
 * the safe area is ours to pad for: a custom header gets no inset of its own.
 *
 * The fade behind the controls is a plain `LinearGradient` in the theme's
 * background color. The day still sets up the iOS 26 `soft` scroll edge
 * effect in `DayPage`, so
 * UIKit also gets the actual scroll view that passes under this custom header.
 */
export function AppHeader({ dayLabel, onPressDay, onPressSettings }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const headerHeight = insets.top + HEADER_BAR_HEIGHT + 12;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
      <NativeHeaderGradientBlur />

      <PressableGlass style={styles.circle} onPress={onPressSettings} accessibilityLabel="Settings">
        <SymbolView
          name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
          size={21}
          tintColor={theme.label}
        />
      </PressableGlass>

      <PressableGlass
        style={styles.pill}
        onPress={onPressDay}
        accessibilityLabel={`${dayLabel}. Opens a calendar to pick a day`}>
        <Text style={[styles.pillLabel, { color: theme.label }]}>{dayLabel}</Text>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={12}
          tintColor={theme.secondaryLabel}
        />
      </PressableGlass>

      <PressableGlass
        style={styles.circle}
        onPress={() => setPreference(NEXT_THEME_PREFERENCE[preference])}
        accessibilityLabel={`${THEME_PREFERENCE_LABEL[preference]}. Double tap to switch to ${NEXT_THEME_PREFERENCE[preference]}`}>
        <SymbolView name={THEME_PREFERENCE_ICON[preference]} size={20} tintColor={theme.label} />
      </PressableGlass>
    </View>
  );
}

type PressableGlassProps = {
  style: object;
  onPress?: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
};

/**
 * Scale rather than opacity for press feedback — glass views render
 * incorrectly when they or a parent drop below full opacity.
 */
function PressableGlass({ style, onPress, accessibilityLabel, children }: PressableGlassProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      <GlassSurface style={style}>{children}</GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Matches the day's own margin so the controls sit over its columns.
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  // No `overflow: 'hidden'` on either — it would clip the surface's shadow.
  circle: {
    width: HEADER_HEIGHT,
    height: HEADER_HEIGHT,
    borderRadius: HEADER_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    height: HEADER_HEIGHT,
    // Keeps the pill from resizing as the day label changes length.
    minWidth: 132,
    borderRadius: HEADER_HEIGHT / 2,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Fonts?.rounded,
  },
});
