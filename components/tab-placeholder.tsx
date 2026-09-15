import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function TabPlaceholder() {
  const theme = useTheme();

  return <View style={[styles.container, { backgroundColor: theme.groupedBackground }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
