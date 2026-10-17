import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="overline" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

type MenuRowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string | number;
  tone?: 'default' | 'danger';
  chevron?: boolean;
  onPress: () => void;
};

export function MenuRow({ icon, title, subtitle, value, tone = 'default', chevron = true, onPress }: MenuRowProps) {
  const color = tone === 'danger' ? 'danger' : 'heading';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <Icon name={icon} size={24} color={color} />
      <View style={styles.flex}>
        <Text variant="bodyMedium" color={tone === 'danger' ? 'danger' : 'text'} style={styles.menuTitle}>
          {title}
        </Text>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
      </View>
      {value != null ? (
        <Text variant="bodySemibold" color="textSecondary">
          {value}
        </Text>
      ) : null}
      {chevron ? <Icon name="chevron-right" size={22} color="textTertiary" /> : null}
    </Pressable>
  );
}

type ToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

export function ToggleRow({ title, subtitle, value, disabled, onChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <Text variant="bodyMedium" style={styles.menuTitle}>
          {title}
        </Text>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: Colors.disabled, true: Colors.green }}
        thumbColor={Colors.white}
        ios_backgroundColor={Colors.disabled}
      />
    </View>
  );
}

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const badgeColors: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: Colors.successSoft, fg: Colors.success },
  warning: { bg: Colors.warningSoft, fg: Colors.warning },
  danger: { bg: Colors.dangerSoft, fg: Colors.danger },
  info: { bg: Colors.surfaceHighlight, fg: '#1E4A7A' },
  neutral: { bg: Colors.chip, fg: Colors.textSecondary },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const c = badgeColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text variant="smallSemibold" style={{ color: c.fg }}>
        {label}
      </Text>
    </View>
  );
}

/** Sekme ve liste satırlarındaki sayı rozetleri */
export function CountBadge({ count, tone = 'danger' }: { count: number; tone?: 'danger' | 'green' }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.count, { backgroundColor: tone === 'green' ? Colors.green : Colors.danger }]}>
      <Text variant="caption" style={styles.countText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

type ChipProps = {
  label: string;
  count?: number;
  selected?: boolean;
  onPress: () => void;
};

export function Chip({ label, count, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text variant="bodyMedium" style={{ color: selected ? Colors.white : Colors.text }}>
        {label}
      </Text>
      {count != null ? (
        <Text variant="smallSemibold" style={{ color: selected ? Colors.greenSoft : Colors.textTertiary }}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function IconTile({ icon, bg = Colors.surfaceMuted, color = 'heading', size = 52 }: {
  icon: IconName;
  bg?: string;
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.iconTile, { width: size, height: size, backgroundColor: bg }]}>
      <Icon name={icon} size={size * 0.46} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { backgroundColor: Colors.background },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  sectionLabel: { marginTop: Spacing.four, marginBottom: Spacing.two, marginHorizontal: Spacing.one },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four - Spacing.one,
  },
  menuTitle: { fontSize: 17 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
  },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: Colors.white, fontSize: 12, lineHeight: 15 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  iconTile: { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
