import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
type Point = {
    date: string;
    value: number | null;
};
export function ProgressChart({ points, color, unit, goal, line = false }: {
    points: Point[];
    color: string;
    unit: string;
    goal?: number;
    line?: boolean;
}) {
    const theme = useTheme();
    const [selected, setSelected] = useState<string | null>(null);
    const values = points.flatMap(p => p.value === null ? [] : [p.value]);
    const low = line && values.length ? Math.max(0, Math.min(...values) - 1) : 0;
    const high = Math.max(low + 1, ...values, goal ?? 0) * (line ? 1.01 : 1.12);
    const x = (i: number) => 42 + (i + 0.5) * 274 / Math.max(points.length, 1);
    const y = (v: number) => 150 - ((v - low) / (high - low)) * 132;
    const active = points.find(p => p.date === selected);
    return <View>
    <Text style={[styles.detail, { color: theme.secondaryLabel }]}>
      {active ? `${active.date}: ${active.value === null ? 'No log' : `${active.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`}` : values.length ? `${values.length} recorded ${values.length === 1 ? 'day' : 'days'}` : 'No entries in this period'}
    </Text>
    <View accessibilityLabel={points.map(p => `${p.date}: ${p.value === null ? 'no log' : `${p.value} ${unit}`}`).join(', ')} accessible>
      <Svg width="100%" height={180} viewBox="0 0 324 180">
        {[low, (low + high) / 2, high].map(v => <Line key={`l${v}`} x1={42} x2={316} y1={y(v)} y2={y(v)} stroke={theme.tertiaryFill}/>)}
        {[low, (low + high) / 2, high].map(v => <SvgText key={`t${v}`} x={36} y={y(v) + 4} fontSize={10} textAnchor="end" fill={theme.secondaryLabel}>{Math.round(v * 10) / 10}</SvgText>)}
        {goal !== undefined && goal > 0 && <Line x1={42} x2={316} y1={y(goal)} y2={y(goal)} stroke={theme.secondaryLabel} strokeDasharray="4 4"/>}
        {line && <Polyline points={points.flatMap((p, i) => p.value === null ? [] : [`${x(i)},${y(p.value)}`]).join(' ')} fill="none" stroke={color} strokeWidth={2.5}/>}
        {points.map((p, i) => <Rect key={`hit${p.date}`} x={x(i) - 137 / points.length} y={0} width={274 / points.length} height={156} fill="transparent" onPress={() => setSelected(p.date)}/>)}
        {points.map((p, i) => p.value === null ? null : line ? <Circle key={p.date} cx={x(i)} cy={y(p.value)} r={selected === p.date ? 5 : 3} fill={color} onPress={() => setSelected(p.date)}/> : <Rect key={p.date} x={x(i) - Math.max(1, 220 / points.length) / 2} y={y(p.value)} width={Math.max(1, 220 / points.length)} height={Math.max(2, 150 - y(p.value))} rx={2} fill={color} opacity={selected && selected !== p.date ? 0.45 : 1} onPress={() => setSelected(p.date)}/>)}
        {[0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => v >= 0 && a.indexOf(v) === i).map(i => <SvgText key={i} x={x(i)} y={175} textAnchor="middle" fontSize={10} fill={theme.secondaryLabel}>{points[i].date.slice(5).replace('-', '/')}</SvgText>)}
      </Svg>
    </View>
  </View>;
}
const styles = StyleSheet.create({ detail: { fontSize: 12, minHeight: 30, paddingTop: 6 } });
