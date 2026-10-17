import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      disabled={disabled || loading}
      style={(state) => [
        styles.button,
        { backgroundColor: isPrimary ? theme.primary : theme.backgroundElement },
        (disabled || state.pressed) && styles.dimmed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.onPrimary : theme.text} />
      ) : (
        <ThemedText type="smallBold" style={{ color: isPrimary ? theme.onPrimary : theme.text }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  dimmed: {
    opacity: 0.6,
  },
});
