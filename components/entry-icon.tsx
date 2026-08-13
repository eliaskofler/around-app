import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useSourceIconUrl } from '@/hooks/use-source-icon';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_FOOD_EMOJI } from '@/utils/food-emoji';
import { Entry } from '@/utils/entries';

type EntryIconProps = {
  entry: Entry;
  size: number;
};

/**
 * What a row leads with, in place of the old plain bullet: a food emoji for
 * our own entries, or the logging app's logo for anything imported from
 * elsewhere in Health.
 */
export function EntryIcon({ entry, size }: EntryIconProps) {
  if (!entry.source || entry.source.kind === 'own') {
    return (
      <Text style={{ fontSize: size * 0.85 }} accessibilityLabel={entry.name}>
        {entry.emoji ?? DEFAULT_FOOD_EMOJI}
      </Text>
    );
  }

  return (
    <SourceLogo
      name={entry.source.name}
      bundleIdentifier={entry.source.bundleIdentifier}
      size={size}
    />
  );
}

type SourceLogoProps = {
  name: string;
  bundleIdentifier: string;
  size: number;
};

/** A third-party source's App Store icon, resolved and cached by `useSourceIconUrl`. */
function SourceLogo({ name, bundleIdentifier, size }: SourceLogoProps) {
  const theme = useTheme();
  const url = useSourceIconUrl(bundleIdentifier);

  if (!url) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size * 0.22, backgroundColor: theme.secondaryFill },
        ]}
        accessibilityLabel={name}>
        <SymbolView
          name={{ ios: 'app.fill', android: 'apps', web: 'apps' }}
          size={size * 0.65}
          tintColor={theme.secondaryLabel}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      cachePolicy="disk"
      accessibilityLabel={name}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
