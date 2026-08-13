import DateTimePicker from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { GlassSurface } from '@/components/glass-surface';
import { Fonts, Radius } from '@/constants/theme';
import { useFoodLog } from '@/hooks/use-food-log';
import { useNutritionGoals } from '@/hooks/use-nutrition-goals';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  addMonths,
  formatFullDate,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfToday,
  toDateKey,
} from '@/utils/date';
import { totalCalories } from '@/utils/entries';

type DayPickerProps = {
  visible: boolean;
  value: Date;
  /** The pager only holds this range, so picking outside it has nowhere to land. */
  minimumDate: Date;
  maximumDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
};

/**
 * Calendar for picking the day being viewed.
 *
 * On Android `DateTimePicker` presents its own dialog, so it is rendered bare.
 * On iOS this is a calendar of our own rather than the native inline picker —
 * that's a bare `UIDatePicker` with no way to decorate individual days, and
 * the whole point here is a small progress ring on every day that has
 * something logged, hosted in the same glass card over a dimmed backdrop.
 */
export function DayPicker({
  visible,
  value,
  minimumDate,
  maximumDate,
  onSelect,
  onClose,
}: DayPickerProps) {
  const theme = useTheme();

  if (!visible) return null;

  if (Platform.OS !== 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="calendar"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onValueChange={(_event, date) => onSelect(date)}
        onDismiss={onClose}
      />
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close calendar">
        {/* Swallow taps on the card so they don't dismiss the modal. */}
        <Pressable onPress={() => {}} style={styles.cardWrapper}>
          <GlassSurface style={styles.card} isInteractive={false}>
            <MonthCalendar
              value={value}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onSelect={onSelect}
            />

            <View style={[styles.divider, { backgroundColor: theme.separator }]} />

            <View style={styles.actions}>
              <Pressable
                onPress={() => onSelect(startOfToday())}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <Text style={[styles.action, { color: theme.tint }]}>Today</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <Text style={[styles.action, styles.actionDone, { color: theme.tint }]}>Done</Text>
              </Pressable>
            </View>
          </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** Fixed at six rows so the grid never resizes as months with five or six weeks come and go. */
const WEEKS_SHOWN = 6;

type MonthCalendarProps = {
  value: Date;
  minimumDate: Date;
  maximumDate: Date;
  onSelect: (date: Date) => void;
};

/** The month grid itself: navigation header, weekday row, and the six-week day grid. */
function MonthCalendar({ value, minimumDate, maximumDate, onSelect }: MonthCalendarProps) {
  const theme = useTheme();
  const { entriesOn } = useFoodLog();
  const { goals } = useNutritionGoals();
  // `DayPicker` unmounts this whole tree whenever the calendar is closed
  // (its early `if (!visible) return null`), so this lazy initializer alone
  // re-centers on the selected day's month every time it opens again —
  // nothing has to watch `value` and reset it back.
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(value));

  const today = startOfToday();
  const gridStart = addDays(visibleMonth, -startOfMonth(visibleMonth).getDay());
  const days = Array.from({ length: WEEKS_SHOWN * 7 }, (_, index) => addDays(gridStart, index));

  const canGoBack = startOfMonth(addMonths(visibleMonth, -1)) >= startOfMonth(minimumDate);
  const canGoForward = startOfMonth(addMonths(visibleMonth, 1)) <= startOfMonth(maximumDate);

  return (
    <View>
      <View style={styles.monthHeader}>
        <NavButton
          direction="back"
          disabled={!canGoBack}
          onPress={() => setVisibleMonth((current) => addMonths(current, -1))}
        />
        <Text style={[styles.monthLabel, { color: theme.label }]}>
          {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <NavButton
          direction="forward"
          disabled={!canGoForward}
          onPress={() => setVisibleMonth((current) => addMonths(current, 1))}
        />
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text
            key={index}
            style={[styles.weekdayLabel, { color: theme.tertiaryLabel }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((date) => (
          <DayCell
            key={toDateKey(date)}
            date={date}
            inCurrentMonth={isSameMonth(date, visibleMonth)}
            isToday={isSameDay(date, today)}
            isSelected={isSameDay(date, value)}
            disabled={date < minimumDate || date > maximumDate}
            calories={totalCalories(entriesOn(toDateKey(date)))}
            goalCalories={goals.calories}
            onPress={onSelect}
          />
        ))}
      </View>
    </View>
  );
}

function NavButton({
  direction,
  disabled,
  onPress,
}: {
  direction: 'back' | 'forward';
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={direction === 'back' ? 'Previous month' : 'Next month'}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({ opacity: disabled ? 0.25 : pressed ? 0.5 : 1 })}>
      <SymbolView
        name={
          direction === 'back'
            ? { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }
            : { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }
        }
        size={16}
        tintColor={theme.tint}
      />
    </Pressable>
  );
}

const RING_SIZE = 34;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
/** However little a day has logged, its ring still shows a visible sliver rather than nothing. */
const MIN_RING_PROGRESS = 0.04;
const SELECTED_DOT_SIZE = 27;

type DayCellProps = {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  disabled: boolean;
  calories: number;
  goalCalories: number;
  onPress: (date: Date) => void;
};

/** One day: its number, and — if anything was logged — a small ring of that day's progress. */
function DayCell({
  date,
  inCurrentMonth,
  isToday,
  isSelected,
  disabled,
  calories,
  goalCalories,
  onPress,
}: DayCellProps) {
  const theme = useTheme();

  const hasEntries = calories > 0;
  const isOverGoal = goalCalories > 0 && calories > goalCalories;
  const progress =
    goalCalories > 0 ? Math.max(Math.min(calories / goalCalories, 1), MIN_RING_PROGRESS) : 0;
  const ringColor = isOverGoal ? theme.danger : theme.accent;

  const numberColor = disabled
    ? theme.quaternaryLabel
    : isSelected
      ? '#FFFFFF'
      : isToday
        ? theme.tint
        : inCurrentMonth
          ? theme.label
          : theme.tertiaryLabel;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onPress(date)}
      accessibilityRole="button"
      accessibilityLabel={formatFullDate(date)}
      accessibilityState={{ selected: isSelected, disabled }}
      style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={styles.cellInner}>
        {hasEntries ? (
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={theme.tertiaryFill}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - progress)}
              fill="none"
              originX={RING_SIZE / 2}
              originY={RING_SIZE / 2}
              rotation={-90}
            />
          </Svg>
        ) : null}

        {isSelected ? (
          <View
            style={[
              styles.selectedDot,
              { backgroundColor: disabled ? theme.tertiaryFill : theme.tint },
            ]}
          />
        ) : null}

        <Text style={[styles.cellLabel, { color: numberColor }]}>{date.getDate()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cardWrapper: {
    // Shadows need room to breathe; the card itself must not clip.
    padding: 4,
  },
  card: {
    borderRadius: Radius.large + 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 4,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  action: {
    fontSize: 17,
    fontFamily: Fonts?.rounded,
  },
  actionDone: {
    fontWeight: '600',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Fonts?.rounded,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInner: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDot: {
    position: 'absolute',
    width: SELECTED_DOT_SIZE,
    height: SELECTED_DOT_SIZE,
    borderRadius: SELECTED_DOT_SIZE / 2,
  },
  cellLabel: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
