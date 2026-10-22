import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

/** Eski (Lucide) ikon setinin adları: `src/components` kaldırılınca da çağıranlar derlensin diye burada sabit tutulur. */
type LegacyIconName =
  | 'arrow-left' | 'arrow-right' | 'arrow-up-down' | 'arrow-up-right' | 'bell' | 'bell-plus' | 'bell-ring' | 'bookmark' | 'building-2' | 'bus'
  | 'calendar' | 'camera' | 'car' | 'check' | 'check-check' | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'circle-check' | 'container'
  | 'credit-card' | 'download' | 'eye' | 'eye-off' | 'forklift' | 'gauge' | 'heart' | 'house' | 'image' | 'info' | 'land-plot' | 'layout-grid'
  | 'log-out' | 'map-pin' | 'megaphone' | 'message-circle' | 'paperclip' | 'phone' | 'phone-call' | 'play' | 'refresh-cw' | 'route' | 'search'
  | 'search-x' | 'send-horizontal' | 'share-2' | 'shield' | 'shield-check' | 'sliders-horizontal' | 'sliders-vertical' | 'sparkles' | 'tag'
  | 'trash-2' | 'trending-down' | 'truck' | 'user' | 'user-round' | 'x';

/** Eski (Lucide) ikon adları da kabul edilir: çağıran ekranlar bozulmasın diye main'in Feather/MCI karşılığına çevrilir. */
export type StateIconName = IconName | LegacyIconName;

const LEGACY_ICONS: Partial<Record<LegacyIconName, IconName>> = {
  'search-x': 'mci:magnify-close',
  'bell-plus': 'mci:bell-plus-outline',
  'bell-ring': 'mci:bell-ring-outline',
  'arrow-up-down': 'mci:swap-vertical',
  'sliders-horizontal': 'sliders',
  'sliders-vertical': 'sliders',
  'send-horizontal': 'send',
  'circle-check': 'check-circle',
  'check-check': 'check',
  'user-round': 'user',
  house: 'home',
  'layout-grid': 'grid',
  'shield-check': 'shield',
  'trending-down': 'trending-down',
  megaphone: 'mci:bullhorn-outline',
  'building-2': 'mci:office-building-outline',
  'land-plot': 'mci:map-marker-radius-outline',
  container: 'mci:cube-outline',
  forklift: 'mci:forklift',
  route: 'mci:truck-trailer',
  gauge: 'mci:speedometer',
  sparkles: 'star',
  'arrow-up-right': 'arrow-up-right',
};

export function resolveStateIcon(name: StateIconName): IconName {
  if (name.startsWith('mci:') || name in Feather.glyphMap) return name as IconName;
  return LEGACY_ICONS[name as LegacyIconName] ?? 'info';
}

export type StateAction = {
  title: string;
  onPress: () => void;
  icon?: StateIconName;
  variant?: 'primary' | 'navy' | 'outline';
  loading?: boolean;
  testID?: string;
};

/**
 * Main'deki `StateView` görünümü (72'lik ikon dairesi, ortalanmış başlık/açıklama, tam genişlik butonlar) + testID'ler.
 * `top`: ekranı ortalamak yerine üstten başlar (tasarımdaki boş durumlar).
 */
export function StatePanel({
  icon,
  title,
  message,
  actions,
  top = false,
  children,
  testID,
}: {
  icon?: StateIconName;
  title?: string;
  message?: string;
  actions?: readonly StateAction[];
  top?: boolean;
  children?: ReactNode;
  testID: string;
}) {
  return (
    <View style={[styles.container, !top && styles.center]} testID={testID}>
      {icon ? (
        <View style={styles.iconCircle}>
          <Icon name={resolveStateIcon(icon)} size={30} />
        </View>
      ) : null}
      {title ? (
        <Text variant="subheading" align="center" style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {message ? (
        <Text variant="body" color="textSecondary" align="center">
          {message}
        </Text>
      ) : null}
      {actions?.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action.title}
              title={action.title}
              icon={action.icon ? resolveStateIcon(action.icon) : undefined}
              variant={action.variant ?? 'navy'}
              loading={action.loading}
              onPress={action.onPress}
              testID={action.testID}
            />
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Boş / hata durumu: simge, başlık, açıklama ve isteğe bağlı eylem (hata durumunda "Tekrar dene"). */
export function StateMessage({
  icon,
  title,
  message,
  actionLabel,
  actionIcon,
  onAction,
  top,
  testID,
}: {
  icon: StateIconName;
  title: string;
  message: string;
  actionLabel?: string;
  actionIcon?: StateIconName;
  onAction?: () => void;
  top?: boolean;
  testID: string;
}) {
  return (
    <StatePanel
      icon={icon}
      title={title}
      message={message}
      top={top}
      actions={actionLabel && onAction ? [{ title: actionLabel, icon: actionIcon, onPress: onAction, testID: `${testID}-action` }] : undefined}
      testID={testID}
    />
  );
}

/** Yükleniyor: main'deki `StateView loading` (ortada lacivert gösterge). `count` geriye uyumluluk için kabul edilir. */
export function ListingSkeletons({ testID }: { count?: number; testID: string }) {
  return (
    <View style={[styles.container, styles.center]} accessible accessibilityLabel="İlanlar yükleniyor" accessibilityState={{ busy: true }} testID={testID}>
      <ActivityIndicator color={Colors.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five + Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  center: { justifyContent: 'center', paddingTop: Spacing.five },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, lineHeight: 26 },
  actions: { alignSelf: 'stretch', gap: Spacing.three, marginTop: Spacing.two },
});
