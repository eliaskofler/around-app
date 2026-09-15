import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressChart } from '@/components/progress-chart';
import { Fonts, Radius } from '@/constants/theme';
import { useWeightLog } from '@/hooks/use-weight-log';
import { useFoodLog } from '@/hooks/use-food-log';
import { useNutritionGoals } from '@/hooks/use-nutrition-goals';
import { useTheme } from '@/hooks/use-theme';
import { startOfToday, toDateKey } from '@/utils/date';
import { MACROS, MACRO_LABELS } from '@/utils/entries';
import { parseWeight, progressDays, validWeightDate, WeightEntry } from '@/utils/progress';
const colors = { carbs: 'orange', protein: 'indigo', fat: 'teal' } as const;
export function ProgressDetail({ category }: { category: 'measurements' | 'nutrition' }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { entriesByDate } = useFoodLog();
    const { goals } = useNutritionGoals();
    const [range, setRange] = useState(30);
    const [today, setToday] = useState(startOfToday);
    const { weights, persist, loadError, error: syncError, busy, refresh, isAvailable } = useWeightLog(category === 'measurements');
    const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
    const [editing, setEditing] = useState(false);
    const [date, setDate] = useState(toDateKey(today));
    const [weight, setWeight] = useState('');
    const [error, setError] = useState('');
    const [history, setHistory] = useState(false);
    useFocusEffect(useCallback(() => {
        setToday(startOfToday());
    }, []));
    const days = progressDays(entriesByDate, today, range);
    const logged = days.filter(d => d.logged);
    const average = (key: 'calories' | 'carbs' | 'protein' | 'fat' | 'water') => logged.length ? logged.reduce((s, d) => s + d[key], 0) / logged.length : 0;
    const factor = unit === 'lb' ? 2.2046226218 : 1;
    const visible = weights.filter(w => w.date >= days[0].date && w.date <= toDateKey(today));
    const latest = weights.at(-1);
    const change = visible.length > 1 ? (visible.at(-1)!.kg - visible[0].kg) * factor : null;
    const energy = MACROS.reduce((s, m) => s + average(m) * (m === 'fat' ? 9 : 4), 0);
    const text = { color: theme.label };
    const muted = { color: theme.secondaryLabel };
    function open(entry?: WeightEntry) {
        setDate(entry?.date ?? toDateKey(startOfToday()));
        setWeight(entry ? (entry.kg * factor).toFixed(2) : '');
        setError('');
        setEditing(true);
    }
    function save() {
        if (busy) return;
        const kg = parseWeight(weight, unit);
        if (kg === null) {
            setError('Enter a valid weight greater than zero.');
            return;
        }
        if (!validWeightDate(date)) {
            setError('Enter a valid date (YYYY-MM-DD), today or earlier.');
            return;
        }
        if (persist([...weights.filter(w => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date))))
            setEditing(false);
        else setError('Could not save weight. Please try again.');
    }
    return <View style={[styles.root, { backgroundColor: theme.groupedBackground }]}>
    <ScrollView
      style={styles.root}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
      <View style={styles.content}>

      <View style={[styles.segment, { backgroundColor: theme.tertiaryFill }]}>{[7, 30, 90].map(n => <Pressable accessibilityRole="tab" accessibilityState={{ selected: n === range }} key={n} onPress={() => setRange(n)} style={[styles.segmentItem, n === range && { backgroundColor: theme.secondaryGroupedBackground }]}><Text style={[styles.bold, text]}>{n} days</Text></Pressable>)}</View>
      <Text style={[styles.caption, muted]}>{days[0].date} - {toDateKey(today)}</Text>
      {category === 'nutrition' && <>
      <View style={styles.stats}><View style={styles.stat}><Text style={[styles.number, text]}>{logged.length ? Math.round(average('calories')).toLocaleString() : '--'}</Text><Text style={[styles.caption, muted]}>kcal / logged day</Text></View><View style={styles.stat}><Text style={[styles.number, text]}>{logged.length}<Text style={[styles.caption, muted]}> / {range}</Text></Text><Text style={[styles.caption, muted]}>days logged</Text></View></View>
      <Section title="Calories" subtitle={`Current base goal: ${goals.calories.toLocaleString()} kcal / day`}>
        <ProgressChart points={days.map(d => ({ date: d.date, value: d.logged ? d.calories : null }))} color={theme.accent} unit="kcal" goal={goals.calories}/>
        <Text style={[styles.caption, muted]}>Dashed line: base goal, before activity. Averages include logged days only.</Text>
      </Section>
      <Section title="Macro balance" subtitle="Average per logged day / current goal">
        <View style={styles.split}>{MACROS.map(m => <View key={m} style={{ flex: energy ? average(m) * (m === 'fat' ? 9 : 4) / energy : 1, backgroundColor: energy ? theme[colors[m]] : theme.tertiaryFill }}/>)}</View>
        {MACROS.map(m => <View key={m} style={styles.macro}><View style={styles.row}><Text style={[styles.bold, { color: theme[colors[m]] }]}>{MACRO_LABELS[m]}</Text><Text style={[styles.caption, muted]}>{Math.round(average(m))} / {goals[m]} g · {energy ? Math.round(average(m) * (m === 'fat' ? 9 : 4) / energy * 100) : 0}% kcal</Text></View><View style={[styles.track, { backgroundColor: theme.tertiaryFill }]}><View style={{ height: 6, borderRadius: 3, width: `${goals[m] > 0 ? Math.min(100, average(m) / goals[m] * 100) : 0}%`, backgroundColor: theme[colors[m]] }}/></View></View>)}
      </Section>
      <Section title="Protein" subtitle={`${Math.round(average('protein'))} g / logged day`}><ProgressChart points={days.map(d => ({ date: d.date, value: d.logged ? d.protein : null }))} color={theme.indigo} unit="g" goal={goals.protein}/></Section>
      <Section title="Hydration" subtitle={`${Math.round(average('water')).toLocaleString()} ml / logged day`}><ProgressChart points={days.map(d => ({ date: d.date, value: d.logged ? d.water : null }))} color={theme.cyan} unit="ml"/></Section>
      <Section title="Consistency" subtitle={`${logged.length} of ${range} days with an entry`}><View style={styles.heatmap}>{days.map(d => <View key={d.date} accessible accessibilityLabel={`${d.date}: ${d.logged ? 'logged' : 'no entries'}`} style={[styles.cell, { backgroundColor: d.logged ? theme.accent : theme.tertiaryFill }]}/>)}</View><Text style={[styles.caption, muted]}>Oldest to newest. Green marks a logged day.</Text></Section>
      </>}
      {category === 'measurements' && <Section title="Body weight" subtitle={latest ? `Latest: ${(latest.kg * factor).toFixed(1)} ${unit} on ${latest.date}` : 'No weight entries yet'}>
        <View style={styles.row}><View style={[styles.segment, { backgroundColor: theme.tertiaryFill }]}>{(['kg', 'lb'] as const).map(u => <Pressable key={u} onPress={() => setUnit(u)} accessibilityRole="tab" accessibilityState={{ selected: unit === u }} style={[styles.unit, unit === u && { backgroundColor: theme.secondaryGroupedBackground }]}><Text style={[styles.bold, text]}>{u}</Text></Pressable>)}</View><Text style={[styles.caption, muted]}>{change === null ? 'Not enough entries for change' : `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit} in period`}</Text></View>
        <ProgressChart points={days.map(d => { const w = weights.find(w => w.date === d.date); return { date: d.date, value: w ? w.kg * factor : null }; })} color={theme.pink} unit={unit} line/>
        {isAvailable && <View style={styles.row}><Text style={[styles.caption, muted]}>{busy ? 'Syncing with Apple Health...' : syncError || 'Connected to Apple Health'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry Health sync" disabled={busy} onPress={() => { void refresh(); }} style={styles.icon}><Ionicons name="sync" size={20} color={theme.tint}/></Pressable></View>}
        {loadError && <Text style={{ color: theme.danger }}>Weight history could not be loaded. Reopen this tab to retry.</Text>}
        <Pressable disabled={loadError || busy} onPress={() => open()} accessibilityRole="button" style={[styles.save, { backgroundColor: theme.accent, opacity: loadError ? 0.4 : 1 }]}><Ionicons name="add" size={20} color="#000"/><Text style={styles.bold}>Log weight</Text></Pressable>
        {weights.length > 0 && <Pressable onPress={() => setHistory(!history)} accessibilityRole="button" style={styles.history}><Text style={[styles.bold, text]}>Weight history ({weights.length})</Text><Ionicons name={history ? 'chevron-up' : 'chevron-down'} size={18} color={theme.secondaryLabel}/></Pressable>}
        {history && [...weights].reverse().map(w => <Pressable accessibilityRole="button" disabled={w.healthReadOnly || busy} accessibilityLabel={`${w.healthReadOnly ? 'Apple Health weight' : 'Edit weight'} for ${w.date}`} key={w.date} onPress={() => open(w)} style={styles.history}><Text style={text}>{w.date}</Text><Text style={[styles.bold, text]}>{(w.kg * factor).toFixed(1)} {unit}</Text><Ionicons name={w.healthReadOnly ? "heart" : "create-outline"} size={18} color={theme.secondaryLabel}/></Pressable>)}
      </Section>}
      </View>
    </ScrollView>
    <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}><ScrollView keyboardShouldPersistTaps="handled" style={[styles.sheet, { backgroundColor: theme.secondaryGroupedBackground }]} contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20), gap: 12 }}><View style={styles.row}><Text style={[styles.heading, text]}>Log weight</Text><Pressable onPress={() => setEditing(false)} accessibilityRole="button" accessibilityLabel="Close" style={styles.icon}><Ionicons name="close" size={24} color={theme.label}/></Pressable></View><Text style={[styles.caption, muted]}>Weight ({unit})</Text><TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" accessibilityLabel={`Weight in ${unit}`} placeholder="0.0" placeholderTextColor={theme.placeholderText} style={[styles.input, text, { backgroundColor: theme.tertiaryFill }]}/><Text style={[styles.caption, muted]}>Date (YYYY-MM-DD)</Text><TextInput value={date} onChangeText={setDate} autoCapitalize="none" accessibilityLabel="Weight date, YYYY-MM-DD" style={[styles.input, text, { backgroundColor: theme.tertiaryFill }]}/><Text style={[styles.caption, muted]}>One entry per day. Saving replaces that date&apos;s weight.</Text>{error ? <Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text> : null}<Pressable disabled={busy} onPress={save} accessibilityRole="button" style={[styles.save, { backgroundColor: theme.accent }]}><Text style={styles.bold}>Save weight</Text></Pressable>{weights.some(w => w.date === date && !w.healthReadOnly) && <Pressable disabled={busy} onPress={() => { if (persist(weights.filter(w => w.date !== date)))
        setEditing(false); }} accessibilityRole="button" style={styles.save}><Ionicons name="trash-outline" size={18} color={theme.danger}/><Text style={{ color: theme.danger }}>Delete entry</Text></Pressable>}</ScrollView></KeyboardAvoidingView></Modal>
  </View>;
}
function Section({ title, subtitle, children }: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    const theme = useTheme();
    return <View style={[styles.section, { borderColor: theme.tertiaryFill }]}><Text style={[styles.heading, { color: theme.label }]}>{title}</Text><Text style={[styles.caption, { color: theme.secondaryLabel }]}>{subtitle}</Text>{children}</View>;
}
const styles = StyleSheet.create({
    root: { flex: 1 }, content: { paddingHorizontal: 20, width: '100%', maxWidth: 680, alignSelf: 'center', gap: 16 },
    title: { fontSize: 32, fontWeight: '700', fontFamily: Fonts?.rounded }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
    glass: { borderRadius: 24 }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    segment: { flexDirection: 'row', borderRadius: 10, padding: 3 }, segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 }, unit: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    caption: { fontSize: 12, lineHeight: 18 }, bold: { fontSize: 14, fontWeight: '600' }, stats: { flexDirection: 'row', gap: 24 }, stat: { flex: 1, gap: 4 }, number: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'], fontFamily: Fonts?.rounded },
    section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 24, paddingBottom: 8, gap: 12 }, heading: { fontSize: 21, fontWeight: '700', fontFamily: Fonts?.rounded },
    split: { flexDirection: 'row', height: 24, borderRadius: 6, overflow: 'hidden', gap: 2 }, macro: { gap: 8 }, track: { height: 6, borderRadius: 3, overflow: 'hidden' },
    heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, cell: { width: 18, height: 18, borderRadius: 4 },
    save: { minHeight: 48, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, history: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, gap: 8 },
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }, sheet: { flexGrow: 0, maxHeight: '90%', borderTopLeftRadius: Radius.large, borderTopRightRadius: Radius.large, width: '100%', maxWidth: 680, alignSelf: 'center' }, input: { borderRadius: Radius.small, padding: 14, fontSize: 18, minHeight: 48 },
});
