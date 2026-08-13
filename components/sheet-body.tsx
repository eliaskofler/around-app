import { Platform, ScrollView, ScrollViewProps, StyleSheet } from 'react-native';
import { useHeaderHeight } from 'expo-router/build/react-navigation/elements';

type SheetBodyProps = ScrollViewProps & {
  /** Space between the navigation bar and the first thing in the form. */
  topPadding?: number;
};

/**
 * The scrolling half of a sheet: everything under its navigation bar.
 *
 * Has to be the sheet's first child, and the only one that is a view — the bar
 * reserves the room this scrolls in, and finds it by walking down first
 * children from the screen. Anything in front of it takes that walk elsewhere,
 * and the form ends up behind the bar with no edge effect on it.
 */
export function SheetBody({
  children,
  contentContainerStyle,
  contentInset,
  contentOffset,
  scrollIndicatorInsets,
  topPadding = 20,
  ...rest
}: SheetBodyProps) {
  const headerHeight = useHeaderHeight();
  const insetTop = Platform.OS === 'ios' ? headerHeight : 0;

  return (
    // Grows into the sheet when it has a height, and sizes to its content when
    // the sheet leaves that height open, so the body always renders.
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.content, contentContainerStyle, { paddingTop: topPadding }]}
      contentInset={insetTop > 0 ? { ...contentInset, top: insetTop } : contentInset}
      contentOffset={insetTop > 0 ? { ...contentOffset, x: 0, y: -insetTop } : contentOffset}
      scrollIndicatorInsets={
        insetTop > 0 ? { ...scrollIndicatorInsets, top: insetTop } : scrollIndicatorInsets
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...rest}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flexGrow: 1,
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 26,
  },
});
