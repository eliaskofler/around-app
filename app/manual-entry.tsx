import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { FormFooterText, FormGroup, FormRow } from '@/components/form';
import { HeaderAction } from '@/components/header-action';
import { SectionPicker } from '@/components/section-picker';
import { SheetBody } from '@/components/sheet-body';
import { useFoodLog } from '@/hooks/use-food-log';
import { useTheme } from '@/hooks/use-theme';
import { caloriesFromMacros, caloriesMismatch, Macro, MACRO_LABELS, MACROS } from '@/utils/entries';
import { sectionForNow, visibleSections } from '@/utils/sections';

type MacroFields = Record<Macro, string>;

const EMPTY_MACROS: MacroFields = { carbs: '', protein: '', fat: '' };

/** Sheet for logging one food into a section of a day, typed in by hand. */
export default function ManualEntry() {
  const router = useRouter();
  const theme = useTheme();
  const { sections, addEntry } = useFoodLog();
  const params = useLocalSearchParams<{ date: string; section?: string }>();

  const shown = visibleSections(sections);
  const [section, setSection] = useState(
    () => params.section ?? sectionForNow(sections),
  );
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [macros, setMacros] = useState<MacroFields>(EMPTY_MACROS);
  const [water, setWater] = useState('');

  const grams = {
    carbs: parseGrams(macros.carbs),
    protein: parseGrams(macros.protein),
    fat: parseGrams(macros.fat),
  };
  const fromMacros = caloriesFromMacros(grams);
  const typed = Number.parseInt(calories, 10);
  const hasTyped = Number.isFinite(typed) && typed > 0;
  const waterMl = parseGrams(water);

  /** With calories left blank, the macros are the total. */
  const total = hasTyped ? typed : fromMacros;
  const mismatch = hasTyped && caloriesMismatch(typed, fromMacros);
  // A pure water entry (0 kcal) is still worth logging, so calories alone don't gate this.
  const canAdd = name.trim().length > 0 && (total > 0 || waterMl > 0) && !mismatch;

  function add() {
    if (!canAdd) return;

    addEntry(params.date, {
      name: name.trim(),
      calories: total,
      ...grams,
      section,
      waterMl: waterMl > 0 ? waterMl : undefined,
    });

    // Closes this sheet and the method picker under it — the day is done being
    // added to, so leaving the picker open would be a step backwards.
    router.dismissAll();
  }

  // The bar is configuration rather than a view, so the form stays the sheet's
  // one and only child — which is what the bar sizes itself against.
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Manual Entry',
          headerLeft: () => <HeaderAction label="Cancel" onPress={() => router.back()} />,
          headerRight: () => (
            <HeaderAction label="Add" onPress={add} disabled={!canAdd} primary />
          ),
        }}
      />

      <SheetBody
        // Native keyboard insets — a KeyboardAvoidingView measures the window
        // rather than the sheet, and pushes the content over the header.
        automaticallyAdjustKeyboardInsets>
        <FormGroup>
          <FormRow label="Name">
            <TextInput
              style={[styles.input, { color: theme.label }]}
              placeholder="What did you eat?"
              placeholderTextColor={theme.placeholderText}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
            />
          </FormRow>
          <FormRow label="Calories">
            <TextInput
              style={[
                styles.input,
                { color: mismatch ? theme.danger : theme.label },
              ]}
              // With macros filled in, their total stands in until it is typed over.
              placeholder={fromMacros > 0 ? `${fromMacros}` : '0'}
              placeholderTextColor={theme.placeholderText}
              value={calories}
              onChangeText={setCalories}
              keyboardType="number-pad"
            />
            <Text style={[styles.unit, { color: theme.secondaryLabel }]}>kcal</Text>
          </FormRow>
        </FormGroup>

        <FormGroup
          title="Macros"
          footer={<MacroFooter fromMacros={fromMacros} typed={typed} mismatch={mismatch} />}>
          {MACROS.map((macro) => (
            <FormRow key={macro} label={MACRO_LABELS[macro]}>
              <TextInput
                style={[styles.input, { color: theme.label }]}
                placeholder="0"
                placeholderTextColor={theme.placeholderText}
                value={macros[macro]}
                onChangeText={(value) => setMacros((current) => ({ ...current, [macro]: value }))}
                keyboardType="number-pad"
              />
              <Text style={[styles.unit, { color: theme.secondaryLabel }]}>g</Text>
            </FormRow>
          ))}

          {mismatch ? (
            <FormRow onPress={() => setCalories(`${fromMacros}`)}>
              <Text style={[styles.fix, { color: theme.tint }]}>Use {fromMacros} kcal</Text>
            </FormRow>
          ) : null}
        </FormGroup>

        <FormGroup title="Water">
          <FormRow label="Water">
            <TextInput
              style={[styles.input, { color: theme.label }]}
              placeholder="0"
              placeholderTextColor={theme.placeholderText}
              value={water}
              onChangeText={setWater}
              keyboardType="number-pad"
            />
            <Text style={[styles.unit, { color: theme.secondaryLabel }]}>ml</Text>
          </FormRow>
        </FormGroup>

        <SectionPicker sections={shown} value={section} onChange={setSection} />
      </SheetBody>
    </>
  );
}

type MacroFooterProps = {
  fromMacros: number;
  typed: number;
  mismatch: boolean;
};

/** Reports what the macros come to, and says so plainly when they disagree. */
function MacroFooter({ fromMacros, typed, mismatch }: MacroFooterProps) {
  if (mismatch) {
    return (
      <FormFooterText tone="danger">
        These macros come to {fromMacros} kcal, not {typed}.
      </FormFooterText>
    );
  }

  if (fromMacros > 0) {
    return <FormFooterText>These macros come to {fromMacros} kcal.</FormFooterText>;
  }

  return <FormFooterText>Leave a macro empty to log it as zero.</FormFooterText>;
}

/** Blank macro fields log as zero rather than blocking the entry. */
function parseGrams(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 17,
    textAlign: 'right',
    paddingVertical: 12,
  },
  unit: {
    fontSize: 15,
  },
  fix: {
    flex: 1,
    fontSize: 17,
  },
});
