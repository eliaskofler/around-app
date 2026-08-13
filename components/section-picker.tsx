import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Section, SECTION_ICONS } from '@/utils/sections';

type SectionPickerProps = {
  /** Already filtered to whatever should be offered — callers decide, e.g. via `visibleSections`. */
  sections: Section[];
  value: string;
  onChange: (id: string) => void;
};

/** Row of tappable section chips, used by every "log a food" form to pick where it lands. */
export function SectionPicker({ sections, value, onChange }: SectionPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.caption, { color: theme.secondaryLabel }]}>SECTION</Text>
      <View style={styles.chips}>
        {sections.map((option) => {
          const isSelected = option.id === value;
          const tint = theme[option.color];

          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? tint : theme.secondaryGroupedBackground,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <SymbolView
                name={SECTION_ICONS[option.icon]}
                size={14}
                tintColor={isSelected ? '#FFFFFF' : tint}
              />
              <Text style={[styles.chipLabel, { color: isSelected ? '#FFFFFF' : theme.label }]}>
                {option.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  caption: {
    fontSize: 13,
    letterSpacing: 0.5,
    paddingHorizontal: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 15,
    borderRadius: Radius.pill,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
