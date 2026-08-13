import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, HEADER_BAR_HEIGHT } from '@/components/app-header';
import { DayPage } from '@/components/day-page';
import { DayPicker } from '@/components/day-picker';
import { LIQUID_GLASS_HEADER_OPTIONS } from '@/constants/navigation';
import { useFoodLog } from '@/hooks/use-food-log';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  DateKey,
  daysBetween,
  formatDayLabel,
  PAGER_DAYS_BEFORE_TODAY,
  startOfToday,
  toDateKey,
} from '@/utils/date';
import { visibleSections } from '@/utils/sections';

/** What the pager holds either side of today before the user has scrolled anywhere. */
const INITIAL_DAYS_BEFORE = PAGER_DAYS_BEFORE_TODAY;
const INITIAL_DAYS_AFTER = 10;
/** How many more days load in, once loaded, either side never shrinks back. */
const GROW_CHUNK_DAYS = 30;
/** Starts loading the next chunk once the visible page is this close to a loaded edge. */
const EDGE_THRESHOLD = 5;
/**
 * How far the calendar itself reaches — independent of what the pager has
 * actually loaded. Picking a date out here grows the pager straight to it
 * (see `selectDay`), so the picker doesn't need to stay inside the loaded
 * window the way swiping does.
 */
const PICKER_DAYS_BEFORE = 365 * 10;
const PICKER_DAYS_AFTER = 365 * 2;

export default function CalorieTracker() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { sections, entriesOn, dropEntry, removeEntry } = useFoodLog();

  /** Fixed for the screen's lifetime — "today" itself doesn't move underneath it. */
  const [today] = useState(startOfToday);
  /** How far the pager currently reaches either side of today — grows as the user nears an edge. */
  const [daysBefore, setDaysBefore] = useState(INITIAL_DAYS_BEFORE);
  const [daysAfter, setDaysAfter] = useState(INITIAL_DAYS_AFTER);
  const [currentPage, setCurrentPage] = useState(INITIAL_DAYS_BEFORE);
  const [isPickingDay, setIsPickingDay] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDraggingEntry, setIsDraggingEntry] = useState(false);

  const pagerRef = useRef<ScrollView>(null);
  /**
   * Set right before growing `daysBefore`: prepending pages shifts every
   * existing page to a higher index, so the scroll position has to jump by
   * the same amount in the same beat or the day on screen visibly changes.
   * Applied once the wider `pages` array actually lands (see the effect
   * below) — appending to `daysAfter` needs no such correction, since it
   * only adds pages after the ones already on screen.
   */
  const pendingScrollTargetRef = useRef<number | null>(null);
  /** What the transparent header covers, and so what the day scrolls under. */
  const headerOffset = insets.top + HEADER_BAR_HEIGHT;
  const shown = useMemo(() => visibleSections(sections), [sections]);

  const pages: { date: Date; dateKey: DateKey }[] = useMemo(
    () =>
      Array.from({ length: daysBefore + daysAfter + 1 }, (_, index) => {
        const pageDate = addDays(today, index - daysBefore);
        return { date: pageDate, dateKey: toDateKey(pageDate) };
      }),
    [today, daysBefore, daysAfter],
  );

  /** The calendar's own range — wide and fixed, unlike the pager's loaded window. */
  const pickerRange = useMemo(
    () => ({
      minimumDate: addDays(today, -PICKER_DAYS_BEFORE),
      maximumDate: addDays(today, PICKER_DAYS_AFTER),
    }),
    [today],
  );

  useEffect(() => {
    const target = pendingScrollTargetRef.current;
    if (target === null) return;

    pendingScrollTargetRef.current = null;
    pagerRef.current?.scrollTo({ x: target * width, animated: false });
  }, [pages.length, width]);

  /**
   * Entries only live in memory for now, so there is nothing to fetch yet —
   * this is the hook to await the real reload from once they are stored.
   */
  async function refresh() {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
    } finally {
      setIsRefreshing(false);
    }
  }

  function scrollToPage(page: number, animated: boolean) {
    pagerRef.current?.scrollTo({ x: page * width, animated });
  }

  /**
   * The calendar reaches much further than the pager has actually loaded, so
   * picking a date out there grows the range straight to it — padded by a
   * chunk so the pick doesn't land right back on the new edge.
   */
  function selectDay(selected: Date) {
    const offset = daysBetween(today, selected);
    const neededBefore = offset < -daysBefore ? -offset + GROW_CHUNK_DAYS : daysBefore;
    const neededAfter = offset > daysAfter ? offset + GROW_CHUNK_DAYS : daysAfter;
    const target = neededBefore + offset;

    setIsPickingDay(false);
    setCurrentPage(target);

    if (neededBefore === daysBefore && neededAfter === daysAfter) {
      scrollToPage(target, false);
      return;
    }

    // Growing before this shifts every already-loaded page, same as a swipe
    // growing it does — deferred to the effect above once the wider range lands.
    pendingScrollTargetRef.current = target;
    if (neededBefore !== daysBefore) setDaysBefore(neededBefore);
    if (neededAfter !== daysAfter) setDaysAfter(neededAfter);
  }

  /**
   * Tracked on every scroll frame rather than only once paging settles, so
   * the header's day label flips the moment the new page is more than
   * halfway in view instead of waiting for the swipe's snap animation to
   * finish.
   */
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.min(Math.max(page, 0), pages.length - 1);
    setCurrentPage((current) => (current === clamped ? current : clamped));
  }

  /**
   * Grows the loaded range once a swipe settles within reach of an edge —
   * checked here rather than on every `onScroll` frame so the correction
   * below only ever has to contend with a gesture that has already ended.
   */
  function onMomentumScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const settled = Math.round(event.nativeEvent.contentOffset.x / width);

    if (settled <= EDGE_THRESHOLD) {
      const target = settled + GROW_CHUNK_DAYS;
      pendingScrollTargetRef.current = target;
      setDaysBefore((current) => current + GROW_CHUNK_DAYS);
      setCurrentPage(target);
    } else if (settled >= pages.length - 1 - EDGE_THRESHOLD) {
      setDaysAfter((current) => current + GROW_CHUNK_DAYS);
    }
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.groupedBackground }]}>
      {/* Set here rather than in the layout: the bar is drawn from the day's
          own state, and options given from the route re-render it as that
          state changes. */}
      <Stack.Screen
        options={{
          headerShown: true,
          ...LIQUID_GLASS_HEADER_OPTIONS,
          header: () => (
            <AppHeader
              dayLabel={formatDayLabel(pages[currentPage].date)}
              onPressDay={() => setIsPickingDay(true)}
              onPressSettings={() => router.push('/settings')}
            />
          ),
        }}
      />

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        // A lifted row owns the gesture until it is dropped.
        scrollEnabled={!isDraggingEntry}
        showsHorizontalScrollIndicator={false}
        // iOS honours the initial offset; Android needs the imperative nudge.
        contentOffset={{ x: INITIAL_DAYS_BEFORE * width, y: 0 }}
        onLayout={() => scrollToPage(INITIAL_DAYS_BEFORE, false)}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.pager}>
        {pages.map((page) => (
          <DayPage
            key={page.dateKey}
            date={page.date}
            dateKey={page.dateKey}
            entries={entriesOn(page.dateKey)}
            sections={shown}
            width={width}
            headerHeight={headerOffset}
            paddingTop={20}
            paddingBottom={insets.bottom + 40}
            refreshing={isRefreshing}
            onRefresh={refresh}
            onMoveEntry={(id, section, index) => dropEntry(page.dateKey, id, section, index)}
            onRemoveEntry={(id) => removeEntry(page.dateKey, id)}
            onDragChange={setIsDraggingEntry}
          />
        ))}
      </ScrollView>

      <DayPicker
        visible={isPickingDay}
        value={pages[currentPage].date}
        minimumDate={pickerRange.minimumDate}
        maximumDate={pickerRange.maximumDate}
        onSelect={selectDay}
        onClose={() => setIsPickingDay(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Unpadded: the navigator floats the header over this, and the day is offset
  // by `headerOffset` instead so it can scroll under the blur.
  flex: {
    flex: 1,
  },
  // Unpadded too: the day's scroll view has to reach the top of the screen for
  // its top edge effect to be drawn over the whole header rather than under it.
  pager: {
    flex: 1,
  },
});
