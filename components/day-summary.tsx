import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Fonts, Radius } from '@/constants/theme';
import { useHealthKit } from '@/hooks/use-health-kit';
import { useNutritionGoals } from '@/hooks/use-nutrition-goals';
import { useTheme } from '@/hooks/use-theme';
import { addDays } from '@/utils/date';
import { Entry, Macro, MACRO_LABELS, MACROS, totalCalories, totalMacro, totalWater } from '@/utils/entries';

const RING_SIZE = 132;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Each macro keeps the same tint everywhere it is shown. */
const MACRO_COLORS: Record<Macro, 'orange' | 'indigo' | 'teal'> = {
  carbs: 'orange',
  protein: 'indigo',
  fat: 'teal',
};

type DaySummaryProps = {
  date: Date;
  entries: Entry[];
};

/** The day at a glance: calories eaten, calories left, and the macro split. */
export function DaySummary({ date, entries }: DaySummaryProps) {
  const theme = useTheme();
  const { goals } = useNutritionGoals();
  const { getBurnedCalories } = useHealthKit();

  // Zero on unavailable platforms — `getBurnedCalories` resolves 0 there itself.
  const [burned, setBurned] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getBurnedCalories({ start: date, end: addDays(date, 1) }).then((total) => {
      if (!cancelled) setBurned(total);
    });

    return () => {
      cancelled = true;
    };
  }, [date, getBurnedCalories]);

  const eaten = totalCalories(entries);
  const water = totalWater(entries);
  // Burned calories widen the budget, same as Apple Health's own ring.
  const budget = goals.calories + burned;
  const left = budget - eaten;
  const isOverGoal = left < 0;
  const progress = budget > 0 ? Math.min(eaten / budget, 1) : 0;
  const ringColor = isOverGoal ? theme.danger : theme.accent;

  return (
    <View style={[styles.card, { backgroundColor: theme.secondaryGroupedBackground }]}>
      <View style={styles.top}>
        <Stat value={`${eaten}`} caption="Eaten" />

        <View style={styles.ring}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Rotated so the ring fills from twelve o'clock. */}
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

          <View style={styles.ringLabel} pointerEvents="none">
            <Text style={[styles.ringValue, { color: theme.label }]}>{Math.abs(left)}</Text>
            <Text style={[styles.ringCaption, { color: theme.secondaryLabel }]}>
              {isOverGoal ? 'kcal over' : 'kcal left'}
            </Text>
          </View>
        </View>

        <Stat value={`${burned}`} caption="Burned" />
      </View>

      <View style={styles.macros}>
        {MACROS.map((macro) => (
          <MacroBar
            key={macro}
            label={MACRO_LABELS[macro]}
            eaten={totalMacro(entries, macro)}
            goal={goals[macro]}
            color={theme[MACRO_COLORS[macro]]}
          />
        ))}
      </View>

      {water > 0 ? (
        <Text style={[styles.water, { color: theme.secondaryLabel }]}>💧 {water} ml today</Text>
      ) : null}
    </View>
  );
}

function Stat({ value, caption }: { value: string; caption: string }) {
  const theme = useTheme();

  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.label }]}>{value}</Text>
      <Text style={[styles.statCaption, { color: theme.secondaryLabel }]}>{caption}</Text>
    </View>
  );
}

type MacroBarProps = {
  label: string;
  eaten: number;
  goal: number;
  color: string;
};

function MacroBar({ label, eaten, goal, color }: MacroBarProps) {
  const theme = useTheme();
  const progress = goal > 0 ? Math.min(eaten / goal, 1) : 0;

  return (
    <View style={styles.macro}>
      <Text style={[styles.macroLabel, { color: theme.secondaryLabel }]}>{label}</Text>
      <View style={[styles.macroTrack, { backgroundColor: theme.tertiaryFill }]}>
        <View
          style={[styles.macroFill, { width: `${progress * 100}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.macroValue, { color: theme.secondaryLabel }]}>
        {Math.round(eaten)} / {goal} g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    paddingHorizontal: 18,
    paddingVertical: 22,
    gap: 24,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    gap: 3,
    minWidth: 58,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statCaption: {
    fontSize: 13,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: Fonts?.rounded,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  ringCaption: {
    fontSize: 13,
    marginTop: 1,
  },
  macros: {
    flexDirection: 'row',
    gap: 16,
  },
  macro: {
    flex: 1,
    gap: 7,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  macroTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroValue: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  water: {
    fontSize: 13,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
