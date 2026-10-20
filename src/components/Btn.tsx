import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, sizes, textStyles } from '@/theme';

import { Icon, type IconName } from './icons/Icon';

type Variant = 'primary' | 'secondary' | 'onDark' | 'navy' | 'danger';

const palette: Record<Variant, { bg: string; pressedBg: string; fg: string; border?: string }> = {
  primary: { bg: colors.green, pressedBg: colors.greenPressed, fg: colors.white },
  secondary: { bg: colors.white, pressedBg: colors.blueTint, fg: colors.navy, border: colors.line },
  onDark: { bg: 'transparent', pressedBg: colors.navyRaised, fg: colors.white, border: colors.blueMid },
  navy: { bg: colors.navy, pressedBg: colors.navyRaised, fg: colors.white },
  // Kaynakta yıkıcı eylem düğmesi yok; "Hesabımı Sil" satırının `danger` tokenı dolgu olur (basılı durum için ayrı renk uydurulmaz).
  danger: { bg: colors.danger, pressedBg: colors.danger, fg: colors.white },
};

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  /** Yükleme sırasında dokunma yok sayılır; ekran okuyucuya "yükleniyor" bildirilir. */
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Btn({ label, onPress, variant = 'primary', icon, loading = false, disabled = false, accessibilityHint, style, testID }: Props) {
  const colorsForVariant = palette[variant];
  const inactive = disabled; // devre dışı görünüm
  const blocked = disabled || loading; // dokunma engeli

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading ? `${label}, yükleniyor` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        inactive
          ? styles.disabled
          : {
              backgroundColor: pressed ? colorsForVariant.pressedBg : colorsForVariant.bg,
              borderWidth: colorsForVariant.border ? 1 : 0,
              borderColor: colorsForVariant.border,
            },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={colorsForVariant.fg} testID="btn-spinner" />
      ) : icon ? (
        <Icon name={icon} size={18} color={inactive ? colors.slatePale : colorsForVariant.fg} />
      ) : null}
      <Text style={[textStyles.button, styles.label, { color: inactive ? colors.slatePale : colorsForVariant.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    minHeight: sizes.buttonHeight,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: { backgroundColor: colors.line, borderWidth: 0 },
  // Büyük yazıda uzun etiket alt satıra iner (tek satırda taşıp kırpılmaz).
  label: { flexShrink: 1, textAlign: 'center' },
});
