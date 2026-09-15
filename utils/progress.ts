import { addDays, toDateKey } from './date';
import { EntriesByDate, totalCalories, totalMacro, totalWater } from './entries';
export function progressDays(entries: EntriesByDate, end: Date, count: number) {
    return Array.from({ length: count }, (_, index) => {
        const date = toDateKey(addDays(end, index - count + 1));
        const foods = entries[date] ?? [];
        return { date, logged: foods.length > 0, calories: totalCalories(foods),
            carbs: totalMacro(foods, 'carbs'), protein: totalMacro(foods, 'protein'),
            fat: totalMacro(foods, 'fat'), water: totalWater(foods) };
    });
}
export type WeightEntry = {
    date: string;
    kg: number;
    healthSampleId?: string;
    healthReadOnly?: boolean;
};
export function validWeightDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const date = new Date(`${value}T12:00:00`);
    return Number.isFinite(date.getTime()) && toDateKey(date) === value && value <= toDateKey(new Date());
}
export function parseWeight(value: string, unit: 'kg' | 'lb') {
    const normalized = value.trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(normalized))
        return null;
    const kg = Number(normalized) / (unit === 'lb' ? 2.2046226218 : 1);
    return Number.isFinite(kg) && kg > 0 && kg <= 700 ? kg : null;
}
