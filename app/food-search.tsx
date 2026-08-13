import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { HeaderAction } from '@/components/header-action';
import { SheetBody } from '@/components/sheet-body';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FoodProduct, searchFoodByName } from '@/utils/open-food-facts';

/** How long to let typing settle before firing a search. */
const DEBOUNCE_MS = 450;

/** Falls back from barcode lookup: type a product's name, then pick which result is actually it. */
export default function FoodSearch() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ date: string; section?: string }>();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodProduct[]>([]);
  // The query `results` was fetched for — lets render tell a fresh result
  // set apart from a stale one still on screen while a newer search runs.
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Guards against a slow earlier search overwriting a faster later one.
  const requestId = useRef(0);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length === 0) return;

    const id = ++requestId.current;

    const timeout = setTimeout(() => {
      setLoading(true);

      void searchFoodByName(trimmedQuery).then((found) => {
        if (requestId.current !== id) return;
        setResults(found);
        setResultsQuery(trimmedQuery);
        setLoading(false);
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [trimmedQuery]);

  const resultsAreCurrent = resultsQuery === trimmedQuery;

  function pick(product: FoodProduct) {
    router.push({ pathname: '/food-result', params: { ...params, barcode: product.barcode } });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search Food',
          headerLeft: () => <HeaderAction label="Cancel" onPress={() => router.back()} />,
        }}
      />

      <SheetBody automaticallyAdjustKeyboardInsets>
        <View style={[styles.searchBar, { backgroundColor: theme.secondaryFill }]}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={16}
            tintColor={theme.secondaryLabel}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.label }]}
            placeholder="Search foods by name"
            placeholderTextColor={theme.placeholderText}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {trimmedQuery.length === 0 ? null : loading || !resultsAreCurrent ? (
          <ActivityIndicator style={styles.spinner} color={theme.secondaryLabel} />
        ) : results.length === 0 ? (
          <Text style={[styles.empty, { color: theme.secondaryLabel }]}>
            No matches for &ldquo;{trimmedQuery}&rdquo;.
          </Text>
        ) : (
          <View style={[styles.list, { backgroundColor: theme.secondaryGroupedBackground }]}>
            {results.map((product, index) => (
              <ResultRow
                key={product.barcode}
                product={product}
                separated={index > 0}
                onPress={() => pick(product)}
              />
            ))}
          </View>
        )}
      </SheetBody>
    </>
  );
}

type ResultRowProps = {
  product: FoodProduct;
  separated: boolean;
  onPress: () => void;
};

function ResultRow({ product, separated, onPress }: ResultRowProps) {
  const theme = useTheme();

  return (
    <>
      {separated ? <View style={[styles.separator, { backgroundColor: theme.separator }]} /> : null}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.quaternaryFill : 'transparent' }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.thumb} cachePolicy="disk" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: theme.secondaryFill }]}>
            <SymbolView
              name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
              size={17}
              tintColor={theme.secondaryLabel}
            />
          </View>
        )}
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: theme.label }]} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={[styles.rowCaption, { color: theme.secondaryLabel }]} numberOfLines={1}>
            {product.brand ? `${product.brand} · ` : ''}
            {product.per100g.calories} kcal / 100g
          </Text>
        </View>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={13}
          tintColor={theme.tertiaryLabel}
        />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.medium,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  spinner: {
    marginTop: 24,
  },
  empty: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 24,
  },
  list: {
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16 + 40 + 12,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: Radius.small,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowCaption: {
    fontSize: 13,
  },
});
