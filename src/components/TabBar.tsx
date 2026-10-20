import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily } from '@/theme';

import { Icon, type IconName } from './icons/Icon';

export const tabs = [
  { key: 'home', label: 'Ana Sayfa', icon: 'house' },
  { key: 'categories', label: 'Kategoriler', icon: 'layout-grid' },
  { key: 'messages', label: 'Mesajlar', icon: 'message-circle' },
  { key: 'notifications', label: 'Bildirimler', icon: 'bell' },
  { key: 'profile', label: 'Profil', icon: 'user' },
] as const satisfies readonly { key: string; label: string; icon: IconName }[];

export type TabKey = (typeof tabs)[number]['key'];

type Props = {
  active: TabKey;
  onSelect?: (key: TabKey) => void;
  /** Okunmamış sayıları; 0 veya verilmezse rozet gösterilmez. */
  counts?: Partial<Record<TabKey, number>>;
};

/** Yüzen çubuk ölçüleri (2. aşama tasarımı: 430 pt genişlikte 16 pt yan boşluk, 63 pt yükseklik, 47 pt aktif hap). */
const BAR_HEIGHT = 64;
const SIDE_MARGIN = 16;
const PILL_HEIGHT = 48;
/** Etiket yalnız aktif hapta görünür; sistem yazı ölçeği bu orana kadar izlenir (hap taşmasın). */
const TAB_MAX_FONT_SCALE = 1.2;

/** Çubuğun ekranın altından uzaklığı: ev göstergesinin üstünde, onunla hafifçe örtüşerek (tasarımdaki gibi). */
const barBottom = (insetBottom: number) => Math.max(insetBottom - 8, 12);

/**
 * Sekme ekranlarının kaydırılabilir içeriğine verilecek alt boşluk: çubuk içeriğin ÜSTÜNDE yüzdüğü için son satır çubuğun altında
 * kalmasın diye çubuk yüksekliği + alt mesafe + 16 pt nefes.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return barBottom(insets.bottom) + BAR_HEIGHT + 16;
}

/**
 * Yüzen alt sekme çubuğu (2. aşama): lacivert yuvarlak çubuk; aktif sekme yeşil hap içinde simge + etiket, diğerleri yalnız simge.
 * İçeriğin üzerinde konumlanır (mutlak); ekranlar `useTabBarClearance()` kadar alt boşluk bırakır.
 */
export function TabBar({ active, onSelect, counts = {} }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: barBottom(insets.bottom) }]}>
      <View accessibilityRole="tablist" style={styles.bar} testID="tab-bar">
        {tabs.map(({ key, label, icon }) => {
          const selected = key === active;
          const count = counts[key] ?? 0;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityLabel={count > 0 ? `${label}, ${count} okunmamış` : label}
              accessibilityState={{ selected }}
              onPress={() => onSelect?.(key)}
              style={[styles.tab, selected && styles.tabActive]}
              testID={`tab-${key}`}>
              <View>
                <Icon name={icon} size={24} color={selected ? colors.white : colors.blueLight} />
                {count > 0 ? (
                  <View style={styles.badge} testID={`tab-${key}-badge`}>
                    <Text style={styles.badgeText} allowFontScaling={false}>
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                ) : null}
              </View>
              {selected ? (
                <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={TAB_MAX_FONT_SCALE}>
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: SIDE_MARGIN, right: SIDE_MARGIN },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: colors.navyDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  tab: { flex: 1, height: PILL_HEIGHT, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  tabActive: { flex: 3.3, borderRadius: PILL_HEIGHT / 2, backgroundColor: colors.green, paddingHorizontal: 12 },
  label: { color: colors.white, fontFamily: fontFamily.inter700, fontSize: 15, flexShrink: 1 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  badgeText: { color: colors.white, fontFamily: fontFamily.inter700, fontSize: 10, lineHeight: 12 },
});
