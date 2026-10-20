import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, sizes, textStyles } from '@/theme';

const status = {
  yeni: { bg: colors.blueTint, fg: colors.blueText, label: 'Yeni' },
  yayinda: { bg: colors.greenTint, fg: colors.greenText, label: 'Yayında' },
  rezerve: { bg: colors.warningTint, fg: colors.warningText, label: 'Rezerve' },
  satildi: { bg: colors.danger, fg: colors.white, label: 'Satıldı' },
  taslak: { bg: colors.lineSoft, fg: colors.inkMuted, label: 'Taslak' },
} as const;

export type StatusVariant = keyof typeof status;

type Props = { variant: StatusVariant; label?: string; testID?: string } | { variant: 'count'; label: string; testID?: string };

/** İlan durumu rozeti (`yeni` · `yayinda` · `rezerve` · `satildi` · `taslak`) veya sayaç rozeti (`count`, ör. "96 ilan"). */
export function Badge(props: Props) {
  const { variant, testID } = props;
  const isCount = variant === 'count';
  const spec = isCount ? { bg: colors.blueTint, fg: colors.blue, label: props.label } : status[variant];
  const label = props.label ?? spec.label;

  return (
    <View style={[styles.base, { backgroundColor: spec.bg }]} accessible accessibilityLabel={label} testID={testID}>
      <Text style={[isCount ? textStyles.count : textStyles.badge, { color: spec.fg }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    minHeight: sizes.badgeHeight,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    justifyContent: 'center',
  },
});
