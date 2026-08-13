import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type HeaderActionProps = {
  label: string;
  onPress: () => void;
  /** The confirming action — heavier, and the one that can be unavailable. */
  primary?: boolean;
  disabled?: boolean;
};

/** A text button in a navigation bar: Cancel, Done, Save. */
export function HeaderAction({ label, onPress, primary, disabled }: HeaderActionProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      style={({ pressed }) => ({ opacity: disabled ? 0.35 : pressed ? 0.4 : 1 })}>
      <Text style={[styles.label, primary && styles.primary, { color: theme.tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 17,
  },
  primary: {
    fontWeight: '600',
  },
});
