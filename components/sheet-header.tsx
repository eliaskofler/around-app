import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NativeHeaderGradientBlur } from '@/components/header-gradient-blur';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BAR_HEIGHT = 44;
/**
 * Clearance above the bar: a formSheet's own grabber sits right at the top of
 * the sheet, and with no native header reserving room below it, an unpadded
 * bar starts right under it — crowding the title and buttons into whatever
 * the grabber doesn't cover.
 */
const TOP_CLEARANCE = 20;
/** How far the gradient fades past the bar into the content below it. */
const FADE_TAIL = 16;
/** Room reserved either side of the centered title for the actions. */
const SIDE_WIDTH = 64;

type SheetHeaderProps = {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
};

/**
 * A sheet or modal's own navigation bar, standing in for the native one —
 * `headerBackground` only repaints the background slot inside React
 * Navigation's native header wrapper, and that wrapper keeps its own
 * translucent material underneath regardless of what gets drawn there. A
 * full custom `header` replaces the wrapper entirely, the same way `AppHeader`
 * does for the day, so the plain gradient fade is all that is left to see.
 *
 * Unlike the day, a sheet or modal isn't drawn edge to edge — the
 * presentation itself already keeps its content clear of the status bar —
 * so this bar doesn't add a safe-area inset on top of its own height.
 */
export function SheetHeader({ title, left, right }: SheetHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <NativeHeaderGradientBlur height={TOP_CLEARANCE + BAR_HEIGHT + FADE_TAIL} />

      <View style={styles.bar}>
        <View style={styles.side}>{left}</View>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>

      {title ? (
        <Text
          style={[styles.title, { color: theme.label }]}
          numberOfLines={1}
          pointerEvents="none">
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: TOP_CLEARANCE + BAR_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  side: {
    minWidth: 44,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  title: {
    position: 'absolute',
    left: SIDE_WIDTH,
    right: SIDE_WIDTH,
    bottom: 0,
    height: BAR_HEIGHT,
    lineHeight: BAR_HEIGHT,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Fonts?.rounded,
  },
});
