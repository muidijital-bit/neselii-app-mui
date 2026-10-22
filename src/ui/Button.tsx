import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

type Variant = 'primary' | 'navy' | 'outline' | 'outlineDark' | 'danger';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
};

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: Colors.green, fg: Colors.white },
  navy: { bg: Colors.navy, fg: Colors.white },
  outline: { bg: Colors.surface, fg: Colors.heading, border: Colors.inputBorder },
  outlineDark: { bg: 'transparent', fg: Colors.white, border: Colors.navyBorder },
  danger: { bg: Colors.danger, fg: Colors.white },
};

export function Button({ title, variant = 'primary', icon, loading, disabled, style, ...rest }: Props) {
  const isDisabled = disabled || loading;
  const colors = disabled ? { bg: Colors.disabled, fg: Colors.onDisabled } : palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      // Etiket açıkça başlıktır: ikon glifi (yazı tipi karakteri) aksi halde etikete boş bir öğe olarak katılıp ", Başlık" okunuyordu.
      // Çağıran kendi `accessibilityLabel`ını verirse (`rest`) o geçerlidir.
      accessibilityLabel={title}
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        { backgroundColor: colors.bg },
        'border' in colors && colors.border ? { borderWidth: 1.5, borderColor: colors.border } : null,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={20} color={colors.fg} /> : null}
          <Text variant="bodySemibold" style={[styles.label, { color: colors.fg }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { fontSize: 17 },
  pressed: { opacity: 0.85 },
});
