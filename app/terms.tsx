import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { HeaderAction } from '@/components/header-action';
import { SheetBody } from '@/components/sheet-body';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LAST_UPDATED = 'August 2, 2026';

type Section = {
  title: string;
  body: string;
};

const SECTIONS: Section[] = [
  {
    title: 'Acceptance of Terms',
    body: 'By downloading, installing, or using Around, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.',
  },
  {
    title: 'What Around Does',
    body: 'Around is a personal food and nutrition logging app. Everything you log — meals, photos, and nutrition goals — is stored on your device. If you turn on Health sync, entries are also written to and read from Apple Health.',
  },
  {
    title: 'Not Medical Advice',
    body: 'Around is provided for general informational purposes only and is not a substitute for professional medical or dietary advice. Calorie and macro figures are estimates. Always consult a qualified healthcare provider before making decisions about your diet, nutrition, or health.',
  },
  {
    title: 'Your Content',
    body: 'Photos, meal entries, and notes you add to Around are yours. You are responsible for what you log and for keeping your device secure, since that content lives on your device (and in Health, if you enable sync).',
  },
  {
    title: 'Acceptable Use',
    body: 'Use Around only for its intended purpose of tracking your own food and nutrition. You agree not to reverse engineer, decompile, or misuse the app in a way that could damage, disable, or impair it.',
  },
  {
    title: 'No Warranty',
    body: 'Around is provided "as is" and "as available," without warranties of any kind, whether express or implied. We do not guarantee that the app will be uninterrupted, error-free, or that nutrition estimates will be accurate.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the fullest extent permitted by law, Around and its developer are not liable for any indirect, incidental, or consequential damages arising from your use of the app, including decisions made based on logged data.',
  },
  {
    title: 'Changes to These Terms',
    body: 'These terms may be updated from time to time as the app changes. Continued use of Around after an update means you accept the revised terms.',
  },
  {
    title: 'Contact',
    body: 'Questions about these terms? Reach out at support@ripledd.com.',
  },
];

/** Static Terms of Service, reachable from Settings — required for App Store review. */
export default function Terms() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Terms of Service',
          headerRight: () => (
            <HeaderAction label="Done" onPress={() => router.back()} primary />
          ),
        }}
      />

      <SheetBody contentContainerStyle={styles.content}>
        <Text style={[styles.updated, { color: theme.secondaryLabel }]}>
          Last updated {LAST_UPDATED}
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.heading, { color: theme.label }]}>{section.title}</Text>
            <Text style={[styles.body, { color: theme.secondaryLabel }]}>{section.body}</Text>
          </View>
        ))}
      </SheetBody>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
  },
  updated: {
    fontSize: 13,
  },
  section: {
    gap: 6,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Fonts?.rounded,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
});
