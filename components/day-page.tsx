import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ScrollViewMarker } from 'react-native-screens/experimental';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useScrollOffset,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { DaySummary } from '@/components/day-summary';
import { EntryDragProvider, useEntryDragController } from '@/components/entry-drag';
import { LIQUID_GLASS_SCROLL_EDGE } from '@/constants/navigation';
import { EntryRowContent } from '@/components/entry-row';
import { SectionCard } from '@/components/section-card';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DateKey, formatFullDate } from '@/utils/date';
import { entriesForSection, Entry } from '@/utils/entries';
import { Section } from '@/utils/sections';

/** How close to an edge the finger has to get before the day scrolls itself. */
const AUTO_SCROLL_EDGE = 72;
/** Fraction of the overshoot travelled per frame. */
const AUTO_SCROLL_SPEED = 0.2;

/**
 * Only iOS has a content inset — everywhere else the header's room is padding
 * on the content, which is what it was here before.
 */
const INSETS_HEADER = Platform.OS === 'ios';

type DayPageProps = {
  date: Date;
  dateKey: DateKey;
  entries: Entry[];
  /** The sections shown on the day, already filtered to the visible ones. */
  sections: Section[];
  /** One full page of the horizontal pager. */
  width: number;
  /** What the floating header covers, and so what the day scrolls under. */
  headerHeight: number;
  /** Space between the header and the top of the day.  */
  paddingTop: number;
  paddingBottom: number;
  refreshing: boolean;
  onRefresh: () => void;
  onMoveEntry: (id: string, section: string, index: number) => void;
  onRemoveEntry: (id: string) => void;
  /** Lets the pager stop paging while a row is in the air. */
  onDragChange: (dragging: boolean) => void;
};

/** A single day in the pager: its total, progress and log. */
export function DayPage({
  date,
  dateKey,
  entries,
  sections,
  width,
  headerHeight,
  paddingTop,
  paddingBottom,
  refreshing,
  onRefresh,
  onMoveEntry,
  onRemoveEntry,
  onDragChange,
}: DayPageProps) {
  const theme = useTheme();

  /** Where the day rests when scrolled to the top — the inset is negative room. */
  const topOffset = INSETS_HEADER ? -headerHeight : 0;

  /**
   * Every day shares the same header height, so a fresh page's `contentInset`
   * is structurally identical to the last page's. iOS's Fabric recycles the
   * native scroll view underneath a fresh mount, and its `prepareForRecycle`
   * unconditionally zeroes `contentInset` but leaves the props RN diffs
   * against unchanged — see https://github.com/facebook/react-native/issues/55090.
   * Since the new page's inset looks unchanged from what the view had before
   * recycling, RN skips reapplying it, so the recycled view keeps the zeroed
   * inset and the day loses its gap under the header. A per-mount nonce on
   * `bottom` (an axis this vertical-only scroll view doesn't otherwise use)
   * forces the value to always differ from the stale one, so RN always
   * reapplies it. `contentOffset` doesn't need the same treatment: recycling
   * resets it straight from the old props rather than gating it behind a
   * diff, and every day page wants the same offset anyway.
   */
  const [recycleNonce] = useState(() => Math.random() / 1000);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);
  const contentHeight = useSharedValue(0);
  const pageHeight = useSharedValue(0);

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);

  const drag = useEntryDragController({
    scrollOffset,
    sectionIds,
    onMoveEntry,
    onRemoveEntry,
    onDragChange,
  });
  const { activeId, origin, pointerY, translation, viewport } = drag;
  const isDragging = drag.entry !== null;

  const lifted = drag.entry;

  /** Drives the day along when a row is held against the top or bottom edge. */
  const autoScroll = useFrameCallback(() => {
    'worklet';
    if (activeId.value === null) return;

    const page = viewport.value;
    const top = page.y + AUTO_SCROLL_EDGE;
    const bottom = page.y + page.height - AUTO_SCROLL_EDGE;
    const overshoot =
      pointerY.value < top ? pointerY.value - top : Math.max(pointerY.value - bottom, 0);
    if (overshoot === 0) return;

    const furthest = Math.max(contentHeight.value - pageHeight.value, 0);
    const next = Math.min(
      Math.max(scrollOffset.value + overshoot * AUTO_SCROLL_SPEED, topOffset),
      furthest,
    );

    scrollTo(scrollRef, 0, next, false);
  }, false);

  useEffect(() => {
    autoScroll.setActive(isDragging);
  }, [autoScroll, isDragging]);

  const liftedStyle = useAnimatedStyle(() => ({
    width: origin.value.width,
    opacity: activeId.value === null ? 0 : 1,
    transform: [
      { translateX: origin.value.x - viewport.value.x + translation.value.x },
      { translateY: origin.value.y - viewport.value.y + translation.value.y },
      { scale: withTiming(activeId.value === null ? 1 : 1.03, { duration: 140 }) },
    ],
  }));

  function onPageLayout(event: LayoutChangeEvent) {
    pageHeight.value = event.nativeEvent.layout.height;
  }

  return (
    <EntryDragProvider value={drag}>
      <View style={{ width }} ref={drag.registerViewport} collapsable={false}>
        {/*
         * The marker is what hands the day's scroll view to UIKit: the effect is
         * a property of the scroll view rather than of a bar, and the pager
         * nests two of them, so the one that gets it has to be named. Set to
         * `hidden` — UIKit's own gradual blur under the header is what the
         * plain gradient in `AppHeader` replaces.
         *
         * @see https://developer.apple.com/documentation/uikit/uiscrolledgeeffect
         */}
        <ScrollViewMarker style={styles.flex} scrollEdgeEffects={LIQUID_GLASS_SCROLL_EDGE}>
          <Animated.ScrollView
            ref={scrollRef}
            style={styles.flex}
            onLayout={onPageLayout}
            onContentSizeChange={(_width, height) => {
              contentHeight.value = height;
            }}
            // Held rows move the day themselves; letting it scroll too would fight them.
            scrollEnabled={!isDragging}
            /*
             * The header's room is an inset rather than padding: the effect is
             * drawn across the scroll view's top inset, so that is the only
             * form of it the blur can reach. `never` keeps UIKit from adding
             * the safe area on top of a header that already covers it.
             */
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            contentInset={INSETS_HEADER ? { top: headerHeight, bottom: recycleNonce } : undefined}
            contentOffset={{ x: 0, y: topOffset }}
            contentContainerStyle={[
              styles.content,
              { paddingTop: INSETS_HEADER ? paddingTop : headerHeight + paddingTop, paddingBottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                // The inset already holds the spinner clear of the header.
                progressViewOffset={INSETS_HEADER ? 0 : headerHeight}
                tintColor={theme.secondaryLabel}
                colors={[theme.accent]}
                progressBackgroundColor={theme.secondaryGroupedBackground}
              />
            }>
            <Text style={[styles.date, { color: theme.secondaryLabel }]}>
              {formatFullDate(date)}
            </Text>

            <View style={styles.summary}>
              <DaySummary date={date} entries={entries} />
            </View>

            <View style={styles.sections}>
              {sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  entries={entriesForSection(entries, section.id)}
                  date={dateKey}
                />
              ))}
            </View>

            {entries.length > 0 ? (
              <Text style={[styles.hint, { color: theme.tertiaryLabel }]}>
                Tap an entry to see its details, or long-press to drag it between sections.
              </Text>
            ) : null}
          </Animated.ScrollView>
        </ScrollViewMarker>

        {/* Sits above the day and never takes a touch of its own. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.lifted,
            {
              backgroundColor: theme.secondaryGroupedBackground,
              shadowColor: theme.glassShadow,
            },
            liftedStyle,
          ]}>
          {lifted ? <EntryRowContent entry={lifted} /> : null}
        </Animated.View>
      </View>
    </EntryDragProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  date: {
    fontSize: 15,
    fontWeight: '600',
    // Lines the day up with the section titles further down.
    paddingHorizontal: 6,
  },
  summary: {
    marginTop: 12,
  },
  sections: {
    marginTop: 32,
    gap: 28,
  },
  hint: {
    marginTop: 24,
    fontSize: 13,
    textAlign: 'center',
  },
  lifted: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: Radius.medium,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
