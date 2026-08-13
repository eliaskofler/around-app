import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Dropdown } from '@/components/dropdown';
import { EntryIcon } from '@/components/entry-icon';
import { FormFooterText, FormGroup, FormRow } from '@/components/form';
import { HeaderAction } from '@/components/header-action';
import { SheetBody } from '@/components/sheet-body';
import { Radius } from '@/constants/theme';
import { useFoodLog } from '@/hooks/use-food-log';
import { useTheme } from '@/hooks/use-theme';
import { AmountUnit, convertQuantity, formatQuantity, gramsForAmount, unitOptionsFor } from '@/utils/amount';
import { caloriesFromMacros, caloriesMismatch, Macro, MACRO_LABELS, MACROS } from '@/utils/entries';
import { scaleProduct } from '@/utils/open-food-facts';

type MacroFields = Record<Macro, string>;

/** Size of the photo/emoji shown above the form. */
const PREVIEW_SIZE = 88;

/**
 * Sheet opened by tapping a logged entry: its full nutrition detail (plus the
 * Open Food Facts photo, when it has one, or its emoji otherwise), editable,
 * with a delete at the bottom. The section it's in isn't editable here —
 * that's what dragging the row between sections is for. Entries imported
 * from another app are read-only — there is nowhere for an edit to go back
 * to in Health, so the note points at the source app instead, same as the
 * old delete-only sheet did.
 *
 * An entry logged from a barcode/search carries its product snapshot
 * (`entry.product`) — editing that one rescales by amount, the same
 * grams/servings field + unit dropdown as `food-result.tsx`, instead of
 * typing raw macros.
 */
export default function EditEntry() {
  const router = useRouter();
  const theme = useTheme();
  const { entriesOn, updateEntry, removeEntry } = useFoodLog();
  const params = useLocalSearchParams<{ date: string; id: string }>();

  const entry = entriesOn(params.date).find((candidate) => candidate.id === params.id);
  const isExternal = entry?.source?.kind === 'external';
  const product = entry?.product;

  const [name, setName] = useState(entry?.name ?? '');
  const [calories, setCalories] = useState(entry && entry.calories > 0 ? `${entry.calories}` : '');
  const [macros, setMacros] = useState<MacroFields>({
    carbs: entry && entry.carbs > 0 ? `${entry.carbs}` : '',
    protein: entry && entry.protein > 0 ? `${entry.protein}` : '',
    fat: entry && entry.fat > 0 ? `${entry.fat}` : '',
  });
  const [water, setWater] = useState(entry?.waterMl ? `${entry.waterMl}` : '');

  const [unit, setUnit] = useState<AmountUnit>(product?.amountUnit ?? 'raw');
  const [amount, setAmount] = useState(`${product?.amountQuantity ?? 100}`);

  // Nothing to show once the entry itself is gone — its own delete just
  // popped this sheet, or it was removed from another day mid-edit.
  if (!entry) return null;

  // A `const` so the narrowing above still holds inside `save`/`confirmDelete` below.
  const current = entry;

  const manualGrams = {
    carbs: parseGrams(macros.carbs),
    protein: parseGrams(macros.protein),
    fat: parseGrams(macros.fat),
  };
  const fromMacros = caloriesFromMacros(manualGrams);
  const typed = Number.parseInt(calories, 10);
  const hasTyped = Number.isFinite(typed) && typed > 0;
  const waterMl = parseGrams(water);

  const total = hasTyped ? typed : fromMacros;
  const mismatch = hasTyped && caloriesMismatch(typed, fromMacros);

  const servingGrams = product?.servingGrams;
  const isLiquid = product?.servingUnit === 'ml';
  const quantity = Number.parseFloat(amount.replace(',', '.'));
  const amountGrams = product ? gramsForAmount(unit, quantity, servingGrams) : 0;
  const hasAmount = Number.isFinite(amountGrams) && amountGrams > 0;
  const scaled = product && hasAmount ? scaleProduct(product, amountGrams) : null;

  const unitOptions = unitOptionsFor(servingGrams, isLiquid);

  const canSave = product
    ? name.trim().length > 0 && hasAmount
    : name.trim().length > 0 && (total > 0 || waterMl > 0) && !mismatch;

  function changeUnit(next: AmountUnit) {
    if (next === unit) return;
    if (Number.isFinite(quantity) && quantity > 0) {
      setAmount(formatQuantity(convertQuantity(quantity, unit, next, servingGrams)));
    }
    setUnit(next);
  }

  function save() {
    if (!canSave) return;

    if (product && scaled) {
      updateEntry(params.date, current.id, {
        name: name.trim(),
        calories: scaled.calories,
        carbs: scaled.carbs,
        protein: scaled.protein,
        fat: scaled.fat,
        section: current.section,
        waterMl: isLiquid ? Math.round(amountGrams) : undefined,
        product: { ...product, amountUnit: unit, amountQuantity: quantity },
      });
    } else {
      updateEntry(params.date, current.id, {
        name: name.trim(),
        calories: total,
        ...manualGrams,
        section: current.section,
        waterMl: waterMl > 0 ? waterMl : undefined,
      });
    }

    router.back();
  }

  function confirmDelete() {
    Alert.alert(`Delete “${current.name}”?`, 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeEntry(params.date, current.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Entry',
          headerLeft: () => (
            <HeaderAction label={isExternal ? 'Done' : 'Cancel'} onPress={() => router.back()} />
          ),
          headerRight: isExternal
            ? undefined
            : () => <HeaderAction label="Save" onPress={save} disabled={!canSave} primary />,
        }}
      />

      <SheetBody topPadding={12} automaticallyAdjustKeyboardInsets>
        <View style={styles.imageWrap}>
          {entry.imageUrl ? (
            <Image source={{ uri: entry.imageUrl }} style={styles.image} cachePolicy="disk" />
          ) : (
            <EntryIcon entry={entry} size={PREVIEW_SIZE} />
          )}
        </View>

        {isExternal && entry.source?.kind === 'external' ? (
          <>
            <FormGroup>
              <FormRow label="Name">
                <Text style={[styles.value, { color: theme.label }]} numberOfLines={1}>
                  {entry.name}
                </Text>
              </FormRow>
              <FormRow label="Calories">
                <Text style={[styles.value, { color: theme.label }]}>{entry.calories} kcal</Text>
              </FormRow>
              {MACROS.map((macro) => (
                <FormRow key={macro} label={MACRO_LABELS[macro]}>
                  <Text style={[styles.value, { color: theme.label }]}>{entry[macro]} g</Text>
                </FormRow>
              ))}
              {entry.waterMl ? (
                <FormRow label="Water">
                  <Text style={[styles.value, { color: theme.label }]}>{entry.waterMl} ml</Text>
                </FormRow>
              ) : null}
            </FormGroup>
            <FormFooterText>
              This entry is from {entry.source.name} — edit or delete it there instead.
            </FormFooterText>
          </>
        ) : product ? (
          <>
            <FormGroup>
              <FormRow label="Name">
                <TextInput
                  style={[styles.input, { color: theme.label }]}
                  placeholder="What did you eat?"
                  placeholderTextColor={theme.placeholderText}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                />
              </FormRow>
            </FormGroup>

            <View style={styles.amountRow}>
              <TextInput
                style={[styles.amountInput, { backgroundColor: theme.secondaryFill, color: theme.label }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType={unit === 'serving' ? 'decimal-pad' : 'number-pad'}
                returnKeyType="done"
              />
              <Dropdown options={unitOptions} value={unit} onChange={changeUnit} />
            </View>

            {product.servingLabel ? (
              <Text style={[styles.footer, { color: theme.secondaryLabel }]}>
                Serving size on the package: {product.servingLabel}.
              </Text>
            ) : null}

            <FormGroup title="Nutrition">
              <FormRow label="Calories">
                <Text style={[styles.value, { color: theme.label }]}>
                  {scaled ? scaled.calories : 0} kcal
                </Text>
              </FormRow>
              {MACROS.map((macro) => (
                <FormRow key={macro} label={MACRO_LABELS[macro]}>
                  <Text style={[styles.value, { color: theme.label }]}>{scaled ? scaled[macro] : 0} g</Text>
                </FormRow>
              ))}
              {isLiquid ? (
                <FormRow label="Water">
                  <Text style={[styles.value, { color: theme.label }]}>
                    {hasAmount ? Math.round(amountGrams) : 0} ml
                  </Text>
                </FormRow>
              ) : null}
            </FormGroup>

            <FormGroup>
              <FormRow label="Delete Entry" destructive onPress={confirmDelete} />
            </FormGroup>
          </>
        ) : (
          <>
            <FormGroup>
              <FormRow label="Name">
                <TextInput
                  style={[styles.input, { color: theme.label }]}
                  placeholder="What did you eat?"
                  placeholderTextColor={theme.placeholderText}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                />
              </FormRow>
              <FormRow label="Calories">
                <TextInput
                  style={[styles.input, { color: mismatch ? theme.danger : theme.label }]}
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

            <FormGroup>
              <FormRow label="Delete Entry" destructive onPress={confirmDelete} />
            </FormGroup>
          </>
        )}
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

/** Blank macro fields log as zero rather than blocking the save. */
function parseGrams(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const styles = StyleSheet.create({
  imageWrap: {
    alignItems: 'center',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: Radius.large,
  },
  input: {
    flex: 1,
    fontSize: 17,
    textAlign: 'right',
    paddingVertical: 12,
  },
  unit: {
    fontSize: 15,
  },
  value: {
    flex: 1,
    fontSize: 17,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  fix: {
    flex: 1,
    fontSize: 17,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  amountInput: {
    width: 90,
    height: 50,
    borderRadius: Radius.medium,
    fontSize: 17,
    textAlign: 'center',
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
});
