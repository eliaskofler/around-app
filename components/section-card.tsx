import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Fragment, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { ROW_HEIGHT, ROW_SLOT, useEntryDrag } from '@/components/entry-drag';
import { EntryRow, ROW_INSET, ROW_LEAD_WIDTH, ROW_TEXT_INSET } from '@/components/entry-row';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DateKey } from '@/utils/date';
import { Entry, totalCalories } from '@/utils/entries';
import { Section, SECTION_ICONS } from '@/utils/sections';

/** Thickness of the line showing where a dragged row would land. */
const INDICATOR_HEIGHT = 2;

type SectionCardProps = {
  section: Section;
  entries: Entry[];
  /** The day the card belongs to, so "Add food" lands on the right date. */
  date: DateKey;
};

/**
 * One section of the day, as an inset grouped list in the style of Reminders:
 * a tinted icon badge and title above a card of rows.
 */
export function SectionCard({ section, entries, date }: SectionCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { target, registerCard } = useEntryDrag();
  const tint = theme[section.color];
  const count = entries.length;

  const registerNode = useCallback(
    (node: View | null) => {
      registerCard(section.id, node, count);
    },
    [count, registerCard, section.id],
  );

  const indicatorStyle = useAnimatedStyle(() => {
    const dropping = target.value;
    if (dropping?.section !== section.id) return { opacity: 0 };

    const slot = Math.min(dropping.index, count);

    return { opacity: 1, transform: [{ translateY: slot * ROW_SLOT }] };
  });

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: tint }]}>
          <SymbolView name={SECTION_ICONS[section.icon]} size={15} tintColor="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: theme.label }]}>{section.title}</Text>
        <Text style={[styles.headerTotal, { color: theme.secondaryLabel }]}>
          {totalCalories(entries)} kcal
        </Text>
      </View>

      <View
        // `collapsable` keeps the node measurable while a drag is in flight.
        ref={registerNode}
        collapsable={false}
        style={[styles.card, { backgroundColor: theme.secondaryGroupedBackground }]}>
        {entries.map((entry, index) => (
          <Fragment key={entry.id}>
            {index > 0 ? (
              <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            ) : null}
            <EntryRow entry={entry} date={date} />
          </Fragment>
        ))}

        {count > 0 ? (
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
        ) : null}

        {/*
          Pushed from here rather than wrapped in a <Link asChild>: that renders
          through a Slot which merges styles by spreading them, and a Pressable's
          style is a function — spreading it leaves the row with no styles at all.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add food to ${section.title}`}
          onPress={() =>
            router.push({ pathname: '/add-food', params: { date, section: section.id } })
          }
          style={({ pressed }) => [styles.addRow, { opacity: pressed ? 0.5 : 1 }]}>
          {/* Shares the bullet's lane so the label lines up with the entries. */}
          <View style={styles.addLead}>
            <SymbolView
              name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
              size={19}
              tintColor={tint}
            />
          </View>
          <Text style={[styles.addLabel, { color: tint }]}>Add food</Text>
        </Pressable>

        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { backgroundColor: tint }, indicatorStyle]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // The badge sits slightly outside the card, the way Reminders sets a list
    // title, while the total lines up with the calories in the rows below.
    paddingLeft: 6,
    paddingRight: ROW_INSET,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts?.rounded,
  },
  headerTotal: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  card: {
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  // Inset to clear the bullet, matching a grouped table view.
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: ROW_TEXT_INSET,
  },
  addRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: ROW_INSET,
  },
  addLead: {
    width: ROW_LEAD_WIDTH,
    alignItems: 'center',
  },
  addLabel: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  indicator: {
    position: 'absolute',
    left: ROW_INSET,
    right: ROW_INSET,
    top: 0,
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_HEIGHT / 2,
  },
});
