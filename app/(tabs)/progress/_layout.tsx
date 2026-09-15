import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = { initialRouteName: 'index' };

export default function ProgressLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: theme.groupedBackground },
      headerTintColor: theme.label,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: theme.groupedBackground },
      headerBackButtonDisplayMode: 'minimal',
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="measurements" options={{ title: 'Measurements' }} />
      <Stack.Screen name="nutrition" options={{ title: 'Nutrition' }} />
    </Stack>
  );
}
