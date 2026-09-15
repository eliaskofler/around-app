import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NativeHeaderGradientBlur } from '@/components/header-gradient-blur';
import { useTheme } from '@/hooks/use-theme';

const categories = [
  {
    title: 'Measurements',
    icon: 'body' as const,
    colors: ['#C930D9', '#DB6BE7'] as const,
    route: '/progress/measurements' as const,
    keywords: 'measurements body weight kg lb',
  },
  {
    title: 'Nutrition',
    icon: 'nutrition-outline' as const,
    colors: ['#30BF56', '#70D57B'] as const,
    route: '/progress/nutrition' as const,
    keywords: 'nutrition calories protein carbs fat water hydration food',
  },
];

export default function ProgressScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const filtered = categories.filter(category => category.keywords.includes(query.trim().toLowerCase()));
  const singleColumn = width < 350 || fontScale > 1.25;
  const headerHeight = insets.top + 12;

  return (
    <View style={[styles.scroll, { backgroundColor: theme.groupedBackground, paddingTop: headerHeight }]}>
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.label }]}>Browse</Text>
      <View style={[styles.search, { backgroundColor: theme.tertiaryFill }]}>
        <Ionicons name="search" size={21} color={theme.secondaryLabel} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor={theme.secondaryLabel}
          accessibilityLabel="Search health categories"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.searchInput, { color: theme.label }]}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={theme.secondaryLabel} />
          </Pressable>
        )}
      </View>
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.label }]}>Health Categories</Text>
      <View style={styles.grid}>
        {filtered.map(category => (
          <Pressable
            key={category.title}
            accessibilityRole="button"
            accessibilityLabel={category.title}
            accessibilityHint={`Opens ${category.title.toLowerCase()} charts`}
            onPress={() => router.push(category.route)}
            style={({ pressed }) => [styles.tile, { width: singleColumn ? '100%' : '48.5%', opacity: pressed ? 0.78 : 1 }]}>
            <LinearGradient colors={category.colors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.tileContent}>
              <Ionicons name={category.icon} size={32} color="#FFFFFF" />
              <Text style={styles.tileLabel}>{category.title}</Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>
      {filtered.length === 0 && <Text style={[styles.empty, { color: theme.secondaryLabel }]}>No matching categories</Text>}
      </View>
    </ScrollView>
    <NativeHeaderGradientBlur height={headerHeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  content: { paddingTop: 12, paddingHorizontal: 20, width: '100%', maxWidth: 680, alignSelf: 'center' },
  title: { fontSize: 34, fontWeight: '700', marginBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, paddingHorizontal: 14, minHeight: 46 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 17, paddingVertical: 11 },
  heading: { fontSize: 22, fontWeight: '700', marginTop: 26, marginBottom: 14, paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: { minHeight: 126, borderRadius: 26, overflow: 'hidden' },
  tileContent: { flex: 1, padding: 16, gap: 10, justifyContent: 'space-between' },
  tileLabel: { fontSize: 17, lineHeight: 23, fontWeight: '600', color: '#FFFFFF' },
  empty: { fontSize: 16, textAlign: 'center', paddingVertical: 28 },
});
