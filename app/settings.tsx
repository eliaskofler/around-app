import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Linking, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormFooterText, FormGroup, FormRow } from '@/components/form';
import { HeaderAction } from '@/components/header-action';
import { SheetBody } from '@/components/sheet-body';
import { useFoodLog } from '@/hooks/use-food-log';
import { useHealthKit } from '@/hooks/use-health-kit';
import { useNutritionGoals } from '@/hooks/use-nutrition-goals';
import { useTheme } from '@/hooks/use-theme';
import { gramsFromPercent, Macro, MACRO_LABELS, MACROS, percentFromGrams } from '@/utils/entries';
import { SECTION_ICONS } from '@/utils/sections';

type MacroFields = Record<Macro, string>;

/** How far a percent split can land from 100% and still read as "on target". */
const PERCENT_TOLERANCE = 1;

/** Settings: nutrition goals, which sections a day has, and what each one looks like. */
export default function Settings() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sections } = useFoodLog();
  const { goals, setCalorieGoal, setMacroGoal } = useNutritionGoals();
  const { isAvailable: healthAvailable, enabled: healthEnabled, setEnabled: setHealthEnabled } =
    useHealthKit();

  const [calories, setCalories] = useState(`${goals.calories}`);
  const [macroFields, setMacroFields] = useState<MacroFields>({
    carbs: `${percentFromGrams('carbs', goals.carbs, goals.calories)}`,
    protein: `${percentFromGrams('protein', goals.protein, goals.calories)}`,
    fat: `${percentFromGrams('fat', goals.fat, goals.calories)}`,
  });

  const typedCalories = Number.parseInt(calories, 10) || 0;

  /** Blank or non-numeric input keeps whatever was last typed rather than snapping back. */
  function editCalories(value: string) {
    setCalories(value);

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setCalorieGoal(parsed);

    // The split is a percent of calories — keep the grams it resolves to in
    // step so the split itself doesn't quietly drift as the budget moves.
    for (const macro of MACROS) {
      const percent = Number.parseInt(macroFields[macro], 10);
      if (Number.isFinite(percent) && percent >= 0) {
        setMacroGoal(macro, gramsFromPercent(macro, percent, parsed));
      }
    }
  }

  function editMacro(macro: Macro, value: string) {
    setMacroFields((current) => ({ ...current, [macro]: value }));

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    setMacroGoal(macro, gramsFromPercent(macro, parsed, typedCalories));
  }

  const parsedGrams = Object.fromEntries(
    MACROS.map((macro) => [
      macro,
      gramsFromPercent(macro, Number.parseInt(macroFields[macro], 10) || 0, typedCalories),
    ]),
  ) as Record<Macro, number>;
  const percentTotal = MACROS.reduce(
    (sum, macro) => sum + (Number.parseInt(macroFields[macro], 10) || 0),
    0,
  );
  const percentOff = Math.abs(percentTotal - 100) > PERCENT_TOLERANCE;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerRight: () => (
            <HeaderAction label="Done" onPress={() => router.back()} primary />
          ),
        }}
      />

      <SheetBody contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <FormGroup title="Nutrition Goals">
          <FormRow label="Calories">
            <TextInput
              style={[styles.goalInput, { color: theme.label }]}
              value={calories}
              onChangeText={editCalories}
              keyboardType="number-pad"
              returnKeyType="done"
            />
            <Text style={[styles.goalUnit, { color: theme.secondaryLabel }]}>kcal</Text>
          </FormRow>
        </FormGroup>

        <FormGroup
          footer={
            <FormFooterText tone={percentOff ? 'danger' : 'default'}>
              {percentOff
                ? `Carbs, protein and fat add up to ${percentTotal}%, not 100%.`
                : `${parsedGrams.carbs}g carbs, ${parsedGrams.protein}g protein, ${parsedGrams.fat}g fat at ${typedCalories} kcal.`}
            </FormFooterText>
          }>
          {MACROS.map((macro) => (
            <FormRow key={macro} label={MACRO_LABELS[macro]}>
              <TextInput
                style={[styles.goalInput, { color: theme.label }]}
                value={macroFields[macro]}
                onChangeText={(value) => editMacro(macro, value)}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              <Text style={[styles.goalUnit, { color: theme.secondaryLabel }]}>%</Text>
            </FormRow>
          ))}
        </FormGroup>

        {healthAvailable ? (
          <FormGroup
            title="Apple Health"
            footer="Writes the calories and macros you log to Health, tagged with the food's name.">
            <FormRow label="Sync to Health">
              <View style={styles.switch}>
                <Switch value={healthEnabled} onValueChange={setHealthEnabled} />
              </View>
            </FormRow>
          </FormGroup>
        ) : null}

        <FormGroup
          title="Sections"
          separatorInset={BADGE_INSET}
          footer="Hidden sections keep whatever was logged in them — they are just left off the day.">
          {sections.map((section) => (
            <FormRow
              key={section.id}
              label={section.title}
              chevron
              onPress={() => router.push({ pathname: '/edit-section', params: { id: section.id } })}
              leading={
                <View style={[styles.badge, { backgroundColor: theme[section.color] }]}>
                  <SymbolView name={SECTION_ICONS[section.icon]} size={15} tintColor="#FFFFFF" />
                </View>
              }>
              <View style={styles.state}>
                {section.hidden ? (
                  <Text style={[styles.stateLabel, { color: theme.secondaryLabel }]}>Hidden</Text>
                ) : null}
              </View>
            </FormRow>
          ))}
        </FormGroup>

        <FormGroup>
          <FormRow
            onPress={() => router.push('/edit-section')}
            leading={
              // Shares the badge's lane so both groups' labels start together.
              <View style={styles.addLead}>
                <SymbolView
                  name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
                  size={21}
                  tintColor={theme.tint}
                />
              </View>
            }>
            <Text style={[styles.add, { color: theme.tint }]}>Add Section</Text>
          </FormRow>
        </FormGroup>

        <FormGroup>
          <FormRow
            label="Privacy Policy"
            chevron
            onPress={() => Linking.openURL('https://around.ripledd.com/privacy')}
          />
          <FormRow label="Terms of Service" chevron onPress={() => router.push('/terms')} />
        </FormGroup>
      </SheetBody>
    </>
  );
}

const BADGE_SIZE = 28;
/** Where the labels start, so the hairlines can start there too. */
const BADGE_INSET = 16 + BADGE_SIZE + 12;

const styles = StyleSheet.create({
  goalInput: {
    flex: 1,
    fontSize: 17,
    textAlign: 'right',
    paddingVertical: 12,
  },
  goalUnit: {
    fontSize: 15,
  },
  switch: {
    flex: 1,
    alignItems: 'flex-end',
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  state: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stateLabel: {
    fontSize: 15,
  },
  addLead: {
    width: BADGE_SIZE,
    alignItems: 'center',
  },
  add: {
    flex: 1,
    fontSize: 17,
  },
});
