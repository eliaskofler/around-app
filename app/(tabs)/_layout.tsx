import { Icon } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

const tabs = [
  {
    name: 'home',
    label: 'Home',
    sf: { default: 'house', selected: 'house.fill' },
    md: { default: 'home', selected: 'home_filled' },
  },
  {
    name: 'workouts',
    label: 'Workouts',
    sf: { default: 'figure.strengthtraining.traditional', selected: 'figure.strengthtraining.traditional' },
    md: { default: 'fitness_center', selected: 'fitness_center' },
  },
  {
    name: 'nutrition',
    label: 'Nutrition',
    sf: { default: 'fork.knife', selected: 'fork.knife' },
    md: { default: 'restaurant', selected: 'restaurant' },
  },
  {
    name: 'progress',
    label: 'Progress',
    sf: { default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' },
    md: { default: 'show_chart', selected: 'show_chart' },
  },
  {
    name: 'profile',
    label: 'Profile',
    sf: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' },
    md: { default: 'account_circle', selected: 'account_circle' },
  },
] as const;

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const isDark = colorScheme === 'dark';

  return (
    <NativeTabs
      backgroundColor={isDark ? 'rgba(28, 28, 30, 0.78)' : 'rgba(255, 255, 255, 0.78)'}
      blurEffect={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      disableTransparentOnScrollEdge
      iconColor={{ default: theme.secondaryLabel, selected: theme.accent }}
      labelVisibilityMode="unlabeled"
      labelStyle={{
        default: { color: theme.secondaryLabel, fontSize: 11, fontWeight: '600' },
        selected: { color: theme.accent, fontSize: 11, fontWeight: '700' },
      }}
      minimizeBehavior="never"
      shadowColor={theme.separator}
      tintColor={theme.accent}>
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <Icon sf={tab.sf} md={tab.md} />
          <NativeTabs.Trigger.Label hidden>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
