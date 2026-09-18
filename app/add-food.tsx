import { useLocalSearchParams, useRouter } from 'expo-router';
import { AndroidSymbol, SFSymbol, SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SheetBody } from '@/components/sheet-body';
import { ColorName, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Method = {
  id: string;
  title: string;
  caption: string;
  icon: { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol };
  color: ColorName;
  /** Where the tile leads. */
  route: '/manual-entry' | '/barcode-scan';
};

/** The ways a food can be logged, in the order the grid lays them out. */
const METHODS: readonly Method[] = [
  {
    id: 'manual',
    title: 'Manual Entry',
    caption: 'Type it in yourself',
    icon: { ios: 'square.and.pencil', android: 'edit', web: 'edit' },
    color: 'blue',
    route: '/manual-entry',
  },
  {
    id: 'barcode',
    title: 'Barcode Scanner',
    caption: 'Scan the packaging',
    icon: { ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' },
    color: 'orange',
    route: '/barcode-scan',
  },
];

/** How a method picks a food, before the day and section it lands in. */
export default function AddFood() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string; section?: string }>();

  /** The day and section travel with the choice, whichever method takes it. */
  function open(method: Method) {
    router.push({ pathname: method.route, params });
  }

  // A single, balanced row: every shown route is usable today.
  const rows = [METHODS];

  return (
    <>
      <SheetBody contentContainerStyle={styles.body}>
        {rows.map((row, index) => (
          <View key={index} style={styles.row}>
            {row.map((method) => (
              <MethodTile key={method.id} method={method} onPress={() => open(method)} />
            ))}
          </View>
        ))}
      </SheetBody>
    </>
  );
}

/** One square of the grid: a tinted glyph over the method's name. */
function MethodTile({ method, onPress }: { method: Method; onPress: () => void }) {
  const theme = useTheme();
  const tint = theme[method.color];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={method.title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.secondaryGroupedBackground,
          opacity: pressed ? 0.6 : 1,
        },
      ]}>
      <View style={[styles.badge, { backgroundColor: tint }]}>
        <SymbolView name={method.icon} size={22} tintColor="#FFFFFF" />
      </View>
      <View style={styles.tileText}>
        <Text style={[styles.tileTitle, { color: theme.label }]} numberOfLines={1}>
          {method.title}
        </Text>
        <Text style={[styles.tileCaption, { color: theme.secondaryLabel }]} numberOfLines={2}>
          {method.caption}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
    // fitToContents already leaves room for the home indicator, so the
    // default bottom padding SheetBody adds for scrollable forms would
    // double up here.
    paddingBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  tile: {
    flex: 1,
    gap: 14,
    padding: 16,
    borderRadius: Radius.large,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    gap: 2,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tileCaption: {
    fontSize: 13,
    lineHeight: 17,
  },
});
