import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, sizes, textStyles } from '@/theme';

import { Icon, type IconName } from './icons/Icon';

type Props = {
  label: string;
  selected?: boolean;
  /** İlan sayısı gibi küçük sayaç. */
  count?: number | string;
  /** Seçili filtre çipinde kaldırma (×) simgesi gösterir; dokunma çipi kaldırır. */
  removable?: boolean;
  icon?: IconName;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

export function Chip({ label, selected = false, count, removable = false, icon, onPress, disabled = false, accessibilityLabel, testID }: Props) {
  const hasCount = count !== undefined && count !== '';
  const fg = selected ? colors.white : colors.inkSoft;
  const muted = selected ? colors.blueLight : colors.slateLight;
  const defaultLabel = hasCount ? `${label}, ${count} ilan` : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? defaultLabel}
      accessibilityHint={removable ? 'Filtreyi kaldırır' : undefined}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        selected
          ? { backgroundColor: colors.navy, borderColor: colors.navy }
          : { backgroundColor: colors.white, borderColor: pressed ? colors.slateFaint : colors.line },
        disabled && styles.disabled,
      ]}>
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text style={[textStyles.chip, { color: fg }]}>{label}</Text>
      {hasCount ? <Text style={[textStyles.count, { color: muted }]}>{count}</Text> : null}
      {removable ? <Icon name="x" size={14} color={selected ? colors.blueLight : colors.slatePale} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.chipHeight,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  disabled: { opacity: 0.5 },
});
