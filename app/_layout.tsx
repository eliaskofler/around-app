import { NativeStackHeaderProps, Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { SheetHeader } from '@/components/sheet-header';
import { LIQUID_GLASS_HEADER_OPTIONS } from '@/constants/navigation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FoodLogProvider } from '@/hooks/use-food-log';
import { HealthKitProvider } from '@/hooks/use-health-kit';
import { NutritionGoalsProvider } from '@/hooks/use-nutrition-goals';
import { useTheme } from '@/hooks/use-theme';
import { ThemePreferenceProvider } from '@/hooks/use-theme-preference';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  // Outside the navigator: the preference has to be applied to the native
  // trait collection before anything below reads `useColorScheme`.
  return (
    <ThemePreferenceProvider>
      <Navigator />
    </ThemePreferenceProvider>
  );
}

function Navigator() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  /**
   * The screen carries the sheets' background rather than a wrapper view: a
   * sheet only sizes its scroll view when that scroll view sits directly under
   * the screen, so there is nothing of ours in between to paint.
   */
  const sheetContent = { backgroundColor: theme.groupedBackground };

  /**
   * A full custom `header` rather than `headerBackground`: the latter only
   * repaints the background slot inside React Navigation's native header
   * wrapper, and that wrapper keeps its own translucent material underneath
   * regardless of what gets drawn there. Swapping in `SheetHeader` bypasses
   * the wrapper entirely, the same way the day's own `AppHeader` does, so
   * only the plain gradient fade shows. `headerTransparent` still has to
   * stay on — it's what tells the navigator not to reserve space for the
   * header, so the form can scroll under it. Each sheet fills in `title`,
   * `headerLeft` and `headerRight` as usual; `SheetHeader` just renders them.
   */
  const sheetHeader = {
    headerShown: true,
    header: (props: NativeStackHeaderProps) => (
      <SheetHeader
        title={typeof props.options.title === 'string' ? props.options.title : undefined}
        left={props.options.headerLeft?.({ canGoBack: props.back !== undefined })}
        right={props.options.headerRight?.({ canGoBack: props.back !== undefined })}
      />
    ),
    ...LIQUID_GLASS_HEADER_OPTIONS,
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <HealthKitProvider>
          <FoodLogProvider>
            <NutritionGoalsProvider>
              <Stack screenOptions={{ headerShown: false }}>
                {/* The day fills in its own `header` — it is the one that needs the
                    day's state, and it sizes the bar itself. */}
                <Stack.Screen name="index" />
                {/* Sized to the grid of methods, which is all this one holds. */}
                <Stack.Screen
                  name="add-food"
                  options={{
                    presentation: 'formSheet',
                    sheetAllowedDetents: 'fitToContents',
                    sheetGrabberVisible: false,
                    contentStyle: sheetContent,
                    headerShown: false,
                  }}
                />
                {/* Draws its own full-bleed camera UI — no sheet chrome, and a full
                    screen rather than a modal since the viewfinder wants all of it. */}
                <Stack.Screen
                  name="barcode-scan"
                  options={{ presentation: 'fullScreenModal', headerShown: false }}
                />
                <Stack.Screen
                  name="food-search"
                  options={{ presentation: 'modal', contentStyle: sheetContent, ...sheetHeader }}
                />
                <Stack.Screen
                  name="food-result"
                  options={{ presentation: 'modal', contentStyle: sheetContent, ...sheetHeader }}
                />
                <Stack.Screen
                  name="manual-entry"
                  options={{ presentation: 'modal', contentStyle: sheetContent, ...sheetHeader }}
                />
                <Stack.Screen
                  name="edit-entry"
                  options={{ presentation: 'modal', contentStyle: sheetContent, ...sheetHeader }}
                />
                <Stack.Screen
                  name="edit-section"
                  options={{ presentation: 'modal', contentStyle: sheetContent, ...sheetHeader }}
                />
                <Stack.Screen
                  name="settings"
                  options={{ presentation: 'modal', contentStyle: sheetContent, ...sheetHeader }}
                />
                <Stack.Screen
                  name="terms"
                  options={{ presentation: 'modal', contentStyle: sheetContent, ...sheetHeader }}
                />
              </Stack>
            </NutritionGoalsProvider>
          </FoodLogProvider>
        </HealthKitProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
