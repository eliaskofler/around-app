import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Dropdown } from '@/components/dropdown';
import { FormGroup, FormRow } from '@/components/form';
import { HeaderAction } from '@/components/header-action';
import { SectionPicker } from '@/components/section-picker';
import { SheetBody } from '@/components/sheet-body';
import { Radius } from '@/constants/theme';
import { useFoodLog } from '@/hooks/use-food-log';
import { useTheme } from '@/hooks/use-theme';
import { AmountUnit, convertQuantity, formatQuantity, gramsForAmount, unitOptionsFor } from '@/utils/amount';
import { MACRO_LABELS, MACROS } from '@/utils/entries';
import { FoodProduct, lookupBarcode, scaleProduct } from '@/utils/open-food-facts';
import { sectionForNow, visibleSections } from '@/utils/sections';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; product: FoodProduct };

/** The product a barcode (or a search pick) resolved to — set the amount, confirm the section, log it. */
export default function FoodResult() {
  const router = useRouter();
  const theme = useTheme();
  const { sections, addEntry } = useFoodLog();
  const params = useLocalSearchParams<{ date: string; section?: string; barcode: string }>();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [unit, setUnit] = useState<AmountUnit>('raw');
  const [amount, setAmount] = useState('100');
  const [section, setSection] = useState(() => params.section ?? sectionForNow(sections));

  useEffect(() => {
    let cancelled = false;

    void lookupBarcode(params.barcode).then((product) => {
      if (cancelled) return;

      if (!product) {
        setState({ status: 'error' });
        return;
      }

      setState({ status: 'ready', product });
      // Default to 1 serving when the package names one — otherwise fall back to 100g/ml.
      if (product.servingGrams) {
        setUnit('serving');
        setAmount('1');
      } else {
        setUnit('raw');
        setAmount('100');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [params.barcode]);

  const servingGrams = state.status === 'ready' ? state.product.servingGrams : undefined;
  const quantity = Number.parseFloat(amount.replace(',', '.'));
  const grams = gramsForAmount(unit, quantity, servingGrams);
  const hasAmount = Number.isFinite(grams) && grams > 0;
  const canAdd = state.status === 'ready' && hasAmount;
  const scaled = state.status === 'ready' && hasAmount ? scaleProduct(state.product, grams) : null;
  // A serving named in `ml` is a liquid — the amount entered doubles as water intake.
  const isLiquid = state.status === 'ready' && state.product.servingUnit === 'ml';

  const unitOptions = unitOptionsFor(servingGrams, isLiquid);

  function changeUnit(next: AmountUnit) {
    if (next === unit) return;
    if (Number.isFinite(quantity) && quantity > 0) {
      setAmount(formatQuantity(convertQuantity(quantity, unit, next, servingGrams)));
    }
    setUnit(next);
  }

  function add() {
    if (state.status !== 'ready' || !scaled) return;

    addEntry(params.date, {
      name: state.product.name,
      calories: scaled.calories,
      carbs: scaled.carbs,
      protein: scaled.protein,
      fat: scaled.fat,
      section,
      waterMl: isLiquid ? Math.round(grams) : undefined,
      imageUrl: state.product.imageUrl,
      product: {
        per100g: state.product.per100g,
        servingGrams: state.product.servingGrams,
        servingUnit: state.product.servingUnit,
        servingLabel: state.product.servingLabel,
        amountUnit: unit,
        amountQuantity: quantity,
      },
    });

    // Closes this sheet along with the scanner/search and the method picker
    // under it — the day is done being added to.
    router.dismissAll();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Food',
          headerLeft: () => <HeaderAction label="Cancel" onPress={() => router.back()} />,
          headerRight: () => (
            <HeaderAction label="Add" onPress={add} disabled={!canAdd} primary />
          ),
        }}
      />

      {state.status === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.secondaryLabel} />
        </View>
      ) : state.status === 'error' ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: theme.secondaryLabel }]}>
            Couldn&rsquo;t load nutrition info for this barcode.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.retryLabel, { color: theme.tint }]}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <SheetBody automaticallyAdjustKeyboardInsets>
          <View style={styles.summary}>
            {state.product.imageUrl ? (
              <Image source={{ uri: state.product.imageUrl }} style={styles.image} cachePolicy="disk" />
            ) : null}
            <View style={styles.summaryText}>
              <Text style={[styles.name, { color: theme.label }]} numberOfLines={2}>
                {state.product.name}
              </Text>
              {state.product.brand ? (
                <Text style={[styles.brand, { color: theme.secondaryLabel }]} numberOfLines={1}>
                  {state.product.brand}
                </Text>
              ) : null}
            </View>
          </View>

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

          {state.product.servingLabel ? (
            <Text style={[styles.footer, { color: theme.secondaryLabel }]}>
              Serving size on the package: {state.product.servingLabel}.
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
                  {hasAmount ? Math.round(grams) : 0} ml
                </Text>
              </FormRow>
            ) : null}
          </FormGroup>

          <SectionPicker sections={visibleSections(sections)} value={section} onChange={setSection} />
        </SheetBody>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  retry: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: Radius.medium,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
  },
  brand: {
    fontSize: 14,
  },
  value: {
    flex: 1,
    fontSize: 17,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
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
