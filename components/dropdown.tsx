import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DropdownOption<T extends string> = { value: T; label: string };

type DropdownProps<T extends string> = {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A tappable value that opens a small centered menu of choices — the
 * grams/servings unit picker. No native picker module is linked into this
 * app's dev client, so this stands in with a plain `Modal` instead.
 */
export function Dropdown<T extends string>({ options, value, onChange }: DropdownProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const label = options.find((option) => option.value === value)?.label ?? '';
  const hasChoices = options.length > 1;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={!hasChoices}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.secondaryFill, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Text style={[styles.label, { color: theme.label }]} numberOfLines={1}>
          {label}
        </Text>
        {hasChoices ? (
          <SymbolView
            name={{ ios: 'chevron.up.chevron.down', android: 'unfold_more', web: 'unfold_more' }}
            size={13}
            tintColor={theme.tertiaryLabel}
          />
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { backgroundColor: theme.secondaryGroupedBackground }]}>
            {options.map((option, index) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.separator,
                  },
                  { backgroundColor: pressed ? theme.quaternaryFill : 'transparent' },
                ]}>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: option.value === value ? theme.tint : theme.label },
                  ]}>
                  {option.label}
                </Text>
                {option.value === value ? (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={17}
                    tintColor={theme.tint}
                  />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.medium,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 17,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 40,
  },
  menu: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  option: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  optionLabel: {
    fontSize: 17,
  },
});
