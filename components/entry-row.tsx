import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle } from 'react-native-reanimated';

import { ROW_HEIGHT, useEntryDragGesture } from '@/components/entry-drag';
import { EntryIcon } from '@/components/entry-icon';
import { useTheme } from '@/hooks/use-theme';
import { DateKey } from '@/utils/date';
import { Entry } from '@/utils/entries';

/** Padding at the card's edge, shared by every row in it. */
export const ROW_INSET = 16;
/** Width of the lane the icon sits in — anything leading a row matches it. */
export const ROW_LEAD_WIDTH = 20;
/** Where a row's text starts, and so where its hairline separator does too. */
export const ROW_TEXT_INSET = ROW_INSET + ROW_LEAD_WIDTH + 12;

type EntryRowProps = {
  entry: Entry;
  /** The day this row belongs to — carried into `/edit-entry`'s route params. */
  date: DateKey;
};

/**
 * A logged entry: a long press lifts it out of its card to drag it between
 * sections, and a plain tap opens `/edit-entry` (full detail, editable, plus
 * delete). The two gestures are raced against each other — a genuine long
 * hold reaches the drag's `activateAfterLongPress` threshold before a `Tap`
 * gesture's own window closes, so holding still always wins the row for
 * dragging, and a quick tap-and-release always wins it for the edit sheet.
 */
export function EntryRow({ entry, date }: EntryRowProps) {
  const theme = useTheme();
  const router = useRouter();
  const { gesture: dragGesture, rowRef, activeId } = useEntryDragGesture(entry);

  const openDetail = useCallback(
    () => router.push({ pathname: '/edit-entry', params: { date, id: entry.id } }),
    [date, entry.id, router],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd((_event, success) => {
        if (success) runOnJS(openDetail)();
      }),
    [openDetail],
  );

  const gesture = useMemo(() => Gesture.Race(dragGesture, tapGesture), [dragGesture, tapGesture]);

  // The lifted copy is drawn over the page, so the row leaves a gap behind.
  const contentStyle = useAnimatedStyle(() => ({
    backgroundColor: theme.secondaryGroupedBackground,
    opacity: activeId.value === entry.id ? 0 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View ref={rowRef} collapsable={false} style={contentStyle}>
        <EntryRowContent entry={entry} />
      </Animated.View>
    </GestureDetector>
  );
}

/** The row's visuals on their own — shared with the copy that follows the finger. */
export function EntryRowContent({ entry }: { entry: Entry }) {
  const theme = useTheme();
  const macros = entry.carbs + entry.protein + entry.fat > 0;

  return (
    <View style={styles.row}>
      <View style={styles.lead}>
        <EntryIcon entry={entry} size={ROW_LEAD_WIDTH} />
      </View>
      <View style={styles.labels}>
        <Text style={[styles.name, { color: theme.label }]} numberOfLines={1}>
          {entry.name}
        </Text>
        {macros ? (
          <Text style={[styles.macros, { color: theme.tertiaryLabel }]} numberOfLines={1}>
            {entry.carbs}C · {entry.protein}P · {entry.fat}F
          </Text>
        ) : null}
      </View>
      <Text style={[styles.calories, { color: theme.secondaryLabel }]}>
        {entry.calories} kcal{entry.waterMl ? `  💧${entry.waterMl} ml` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: ROW_INSET,
  },
  lead: {
    width: ROW_LEAD_WIDTH,
    alignItems: 'center',
  },
  labels: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  macros: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  calories: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});
