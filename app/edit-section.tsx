import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { FormGroup, FormRow } from '@/components/form';
import { HeaderAction } from '@/components/header-action';
import { SheetBody } from '@/components/sheet-body';
import { Fonts, Radius } from '@/constants/theme';
import { useFoodLog } from '@/hooks/use-food-log';
import { useTheme } from '@/hooks/use-theme';
import {
  newSectionId,
  Section,
  SECTION_COLORS,
  SECTION_ICONS,
  SectionColor,
  SectionIcon,
  sectionById,
} from '@/utils/sections';

const ICON_IDS = Object.keys(SECTION_ICONS) as SectionIcon[];

/** Sheet for adding a section, or editing the look of an existing one. */
export default function EditSection() {
  const router = useRouter();
  const theme = useTheme();
  const { sections, saveSection, removeSection } = useFoodLog();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const existing = id ? sectionById(sections, id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState<SectionIcon>(existing?.icon ?? 'cutlery');
  const [color, setColor] = useState<SectionColor>(existing?.color ?? unusedColor(sections));
  const [shown, setShown] = useState(!existing?.hidden);

  const canSave = title.trim().length > 0;
  const tint = theme[color];

  function save() {
    if (!canSave) return;

    saveSection({
      id: existing?.id ?? newSectionId(),
      title: title.trim(),
      icon,
      color,
      hidden: !shown,
    });

    router.back();
  }

  function confirmDelete() {
    if (!existing) return;

    Alert.alert(
      `Delete “${existing.title}”?`,
      'Anything logged in it moves to the first section.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeSection(existing.id);
            router.back();
          },
        },
      ],
    );
  }

  // Header and scroll view are the sheet's only two children on purpose: it
  // sizes the scroll view itself, and only when it sits directly under them.
  return (
    <>
      <Stack.Screen
        options={{
          title: existing ? 'Edit Section' : 'New Section',
          headerLeft: () => <HeaderAction label="Cancel" onPress={() => router.back()} />,
          headerRight: () => (
            <HeaderAction
              label={existing ? 'Save' : 'Add'}
              onPress={save}
              disabled={!canSave}
              primary
            />
          ),
        }}
      />

      <SheetBody
        topPadding={12}
        // Native keyboard insets — a KeyboardAvoidingView measures the window
        // rather than the sheet, and pushes the content over the header.
        automaticallyAdjustKeyboardInsets>
        <View style={styles.preview}>
          <View style={[styles.previewBadge, { backgroundColor: tint }]}>
            <SymbolView name={SECTION_ICONS[icon]} size={34} tintColor="#FFFFFF" />
          </View>
          <Text style={[styles.previewTitle, { color: theme.label }]} numberOfLines={1}>
            {title.trim() || 'New Section'}
          </Text>
        </View>

        <FormGroup>
          <FormRow label="Name">
            <TextInput
              style={[styles.input, { color: theme.label }]}
              placeholder="Section name"
              placeholderTextColor={theme.placeholderText}
              value={title}
              onChangeText={setTitle}
              autoFocus={!existing}
              returnKeyType="done"
              onSubmitEditing={save}
            />
          </FormRow>
          <FormRow label="Show on Day">
            <View style={styles.switch}>
              <Switch value={shown} onValueChange={setShown} />
            </View>
          </FormRow>
        </FormGroup>

        <FormGroup title="Icon">
          <View style={styles.grid}>
            {ICON_IDS.map((option) => {
              const isSelected = option === icon;

              return (
                <Pressable
                  key={option}
                  onPress={() => setIcon(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.iconCell,
                    {
                      backgroundColor: isSelected ? tint : theme.tertiaryFill,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}>
                  <SymbolView
                    name={SECTION_ICONS[option]}
                    size={19}
                    tintColor={isSelected ? '#FFFFFF' : theme.secondaryLabel}
                  />
                </Pressable>
              );
            })}
          </View>
        </FormGroup>

        <FormGroup title="Color">
          <View style={styles.grid}>
            {SECTION_COLORS.map((option) => {
              const isSelected = option === color;

              return (
                <Pressable
                  key={option}
                  onPress={() => setColor(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.colorCell,
                    {
                      borderColor: isSelected ? theme.label : 'transparent',
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}>
                  <View style={[styles.swatch, { backgroundColor: theme[option] }]} />
                </Pressable>
              );
            })}
          </View>
        </FormGroup>

        {existing && sections.length > 1 ? (
          <FormGroup>
            <FormRow label="Delete Section" destructive onPress={confirmDelete} />
          </FormGroup>
        ) : null}
      </SheetBody>
    </>
  );
}

/** Starts a new section on a color none of the others are using. */
function unusedColor(sections: Section[]): SectionColor {
  const taken = new Set(sections.map((section) => section.color));

  return SECTION_COLORS.find((color) => !taken.has(color)) ?? SECTION_COLORS[0];
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  previewBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts?.rounded,
  },
  input: {
    flex: 1,
    fontSize: 17,
    textAlign: 'right',
    paddingVertical: 12,
  },
  switch: {
    flex: 1,
    alignItems: 'flex-end',
  },
  // Six cells to a row, spread to the card's padding on both sides.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    padding: 16,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
  },
});
