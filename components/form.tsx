import { SymbolView } from 'expo-symbols';
import { Children, Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Height of a standard grouped-list row. */
export const FORM_ROW_HEIGHT = 50;

/** Text inset inside a card — where labels, captions and separators line up. */
const CONTENT_INSET = 16;

type FormGroupProps = {
  /** Caption above the card, rendered the way iOS sets grouped headers. */
  title?: string;
  /** Plain text, or a node when the footer has to change with the form. */
  footer?: React.ReactNode;
  /**
   * How far separators clear the card's left edge. Lists whose rows lead with
   * a badge pass the badge's width so the hairlines start at the labels.
   */
  separatorInset?: number;
  children: React.ReactNode;
};

/** An inset grouped card, hairline-separating whatever rows it is given. */
export function FormGroup({
  title,
  footer,
  separatorInset = CONTENT_INSET,
  children,
}: FormGroupProps) {
  const theme = useTheme();
  const rows = Children.toArray(children);

  return (
    <View style={styles.group}>
      {title ? (
        <Text style={[styles.caption, { color: theme.secondaryLabel }]}>{title.toUpperCase()}</Text>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.secondaryGroupedBackground }]}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View
                style={[
                  styles.separator,
                  { marginLeft: separatorInset, backgroundColor: theme.separator },
                ]}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>

      {typeof footer === 'string' ? <FormFooterText>{footer}</FormFooterText> : footer}
    </View>
  );
}

/** Footer copy under a group — `danger` for a rule the form is failing. */
export function FormFooterText({
  tone = 'default',
  children,
}: {
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Text style={[styles.footer, { color: tone === 'danger' ? theme.danger : theme.secondaryLabel }]}>
      {children}
    </Text>
  );
}

type FormRowProps = {
  label?: string;
  /** Leading badge or icon. */
  leading?: React.ReactNode;
  /** Trailing control — a text field, a switch, a value. */
  children?: React.ReactNode;
  onPress?: () => void;
  /** Adds the disclosure chevron of a row that opens something. */
  chevron?: boolean;
  destructive?: boolean;
};

export function FormRow({ label, leading, children, onPress, chevron, destructive }: FormRowProps) {
  const theme = useTheme();

  const content = (
    <>
      {leading}
      {label ? (
        <Text
          style={[styles.label, { color: destructive ? theme.danger : theme.label }]}
          numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      {children}
      {chevron ? (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={13}
          tintColor={theme.tertiaryLabel}
        />
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.quaternaryFill : 'transparent' },
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  caption: {
    fontSize: 13,
    letterSpacing: 0.5,
    paddingHorizontal: CONTENT_INSET,
  },
  card: {
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: FORM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: CONTENT_INSET,
  },
  label: {
    fontSize: 17,
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: CONTENT_INSET,
    paddingTop: 2,
  },
});
