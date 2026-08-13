import { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { ColorName } from '@/constants/theme';

export type SectionSymbol = { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol };

/**
 * The icons a section can be given, in the order the picker shows them —
 * eighteen of them, so the grid fills three rows of six exactly.
 */
export const SECTION_ICONS = {
  sunrise: { ios: 'sunrise.fill', android: 'wb_twilight', web: 'wb_twilight' },
  sun: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  moon: { ios: 'moon.stars.fill', android: 'dark_mode', web: 'dark_mode' },
  cutlery: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  takeout: { ios: 'takeoutbag.and.cup.and.straw.fill', android: 'lunch_dining', web: 'lunch_dining' },
  coffee: { ios: 'cup.and.saucer.fill', android: 'local_cafe', web: 'local_cafe' },
  mug: { ios: 'mug.fill', android: 'emoji_food_beverage', web: 'emoji_food_beverage' },
  popcorn: { ios: 'popcorn.fill', android: 'fastfood', web: 'fastfood' },
  carrot: { ios: 'carrot.fill', android: 'nutrition', web: 'nutrition' },
  leaf: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
  fish: { ios: 'fish.fill', android: 'set_meal', web: 'set_meal' },
  cake: { ios: 'birthday.cake.fill', android: 'cake', web: 'cake' },
  wine: { ios: 'wineglass.fill', android: 'wine_bar', web: 'wine_bar' },
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  flame: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  workout: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  pill: { ios: 'pills.fill', android: 'medication', web: 'medication' },
} as const satisfies Record<string, SectionSymbol>;

export type SectionIcon = keyof typeof SECTION_ICONS;

/** The tints a section can be given, in picker order. */
export const SECTION_COLORS = [
  'orange',
  'green',
  'indigo',
  'pink',
  'blue',
  'purple',
  'teal',
  'red',
  'yellow',
  'mint',
  'cyan',
  'brown',
] as const satisfies readonly ColorName[];

export type SectionColor = (typeof SECTION_COLORS)[number];

export type Section = {
  id: string;
  title: string;
  icon: SectionIcon;
  color: SectionColor;
  /** Kept in the settings list, but left off the day. */
  hidden: boolean;
};

/** What a fresh install starts with — every one of them is editable. */
export const DEFAULT_SECTIONS: readonly Section[] = [
  { id: 'breakfast', title: 'Breakfast', icon: 'sunrise', color: 'orange', hidden: false },
  { id: 'lunch', title: 'Lunch', icon: 'sun', color: 'green', hidden: false },
  { id: 'dinner', title: 'Dinner', icon: 'moon', color: 'indigo', hidden: false },
  { id: 'snacks', title: 'Snacks', icon: 'carrot', color: 'pink', hidden: false },
];

export function visibleSections(sections: Section[]): Section[] {
  return sections.filter((section) => !section.hidden);
}

export function sectionById(sections: Section[], id: string): Section | undefined {
  return sections.find((section) => section.id === id);
}

export function newSectionId(): string {
  return `section-${Date.now()}`;
}

/** Whichever section a log made right now most likely belongs to. */
export function sectionForNow(sections: Section[], now: Date = new Date()): string {
  const shown = visibleSections(sections);
  if (shown.length === 0) return sections[0]?.id ?? '';

  const hour = now.getHours();
  // Only meaningful for the stock sections; anything else falls back to the first.
  const preferred =
    hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 21 ? 'dinner' : 'snacks';

  return shown.find((section) => section.id === preferred)?.id ?? shown[0].id;
}
