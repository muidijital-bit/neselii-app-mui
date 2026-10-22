import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';

const icons: Record<string, IconName> = {
  index: 'home',
  categories: 'grid',
  messages: 'message-circle',
  notifications: 'bell',
  profile: 'user',
};

const BAR_HEIGHT = 64;
const bottomGap = (insetBottom: number) => Math.max(insetBottom - 8, Spacing.three);

/** Sekme ekranlarında içeriğin yüzen menünün altında kalmaması için gereken alt boşluk */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + bottomGap(insets.bottom) + Spacing.three;
}

export type TabItem = {
  /** Sekme rotasının adı (`index`, `categories`, `messages`, `notifications`, `profile`). */
  readonly name: string;
  readonly title: string;
  /** Okunmamış sayısı; 0 ise rozet çizilmez. */
  readonly count?: number;
};

const badgeText = (count: number | undefined) => (count ? (count > 99 ? '99+' : String(count)) : null);

/** Aktif sekme diğerlerinin bu katı genişlikte (yeşil hap simge + yazıyı taşır). */
const ACTIVE_FLEX = 2.2;
const BAR_PADDING = 8;
const ITEM_HEIGHT = 48;
const SLIDE = { duration: 320, easing: Easing.out(Easing.cubic) };
/** Aktif sekme yazısının en geniş hali ("Bildirimler" 13 pt kalın sığar). */
const LABEL_MAX_WIDTH = 120;

/**
 * Yüzen lacivert alt menü: aktif sekme yeşil bir hap içinde simge + yazıyla genişler, diğerleri yalnızca simge olarak durur.
 * Sekme değişince yeşil hap yeni sekmeye kayar; sekme genişlikleri aynı ilerlemeyle değiştiği için simgeler de hapla birlikte akar.
 * "Hareketi azalt" açıksa geçiş anında olur.
 */
export function TabBar({ tabs, active, onSelect }: { tabs: readonly TabItem[]; active: string; onSelect: (name: string) => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.name === active));
  const position = useSharedValue(activeIndex);
  const target = useSharedValue(activeIndex);
  const [innerWidth, setInnerWidth] = useState(0);

  useEffect(() => {
    target.value = activeIndex;
    // Kayma yarıda kesilirse (ör. üstte ekran açılırken kare geri çağrısı düşerse) ve hedef hâlâ bu sekmeyse hap doğrudan yerine oturur;
    // yeni bir sekmeye geçildiği için kesildiyse hedef değişmiştir, yeni kayma sürer.
    position.value = reduceMotion
      ? activeIndex
      : withTiming(activeIndex, SLIDE, (finished) => {
          if (!finished && target.value === activeIndex) position.value = activeIndex;
        });
  }, [activeIndex, reduceMotion, position, target]);

  // Tek birim genişlik: (n - 1) pasif sekme + 1 aktif sekme toplam genişliği paylaşır.
  const unit = innerWidth / (tabs.length - 1 + ACTIVE_FLEX);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * unit }] }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomGap(insets.bottom) }]}>
      <View style={styles.bar} accessibilityRole="tablist" testID="tab-bar" onLayout={(event) => setInnerWidth(event.nativeEvent.layout.width - BAR_PADDING * 2)}>
        {innerWidth > 0 ? <Animated.View pointerEvents="none" style={[styles.pill, { width: unit * ACTIVE_FLEX }, pillStyle]} /> : null}
        {tabs.map((tab, index) => (
          <TabButton key={tab.name} tab={tab} index={index} focused={index === activeIndex} position={position} onPress={() => onSelect(tab.name)} />
        ))}
      </View>
    </View>
  );
}

function TabButton({ tab, index, focused, position, onPress }: { tab: TabItem; index: number; focused: boolean; position: SharedValue<number>; onPress: () => void }) {
  const badge = badgeText(tab.count);
  const id = tab.name === 'index' ? 'home' : tab.name;
  // Hap bu sekmeye yaklaştıkça sekme genişler (1 → ACTIVE_FLEX); hapın konumuyla aynı değerden türediği için ikisi hizalı kalır.
  const itemStyle = useAnimatedStyle(() => ({ flex: 1 + (ACTIVE_FLEX - 1) * Math.max(0, 1 - Math.abs(position.value - index)) }));
  // Yazı da aynı ilerlemeyle açılır: sekme daralken yer kaplayıp simgeyi kenara itmez.
  const labelStyle = useAnimatedStyle(() => {
    const progress = Math.max(0, 1 - Math.abs(position.value - index));
    // Yazı hap yerine oturmaya yaklaşınca belirir (kayarken hapın dışında görünmez).
    return { maxWidth: progress * LABEL_MAX_WIDTH, opacity: Math.min(1, Math.max(0, (progress - 0.6) / 0.4)) };
  });

  return (
    <Animated.View style={itemStyle}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={badge ? `${tab.title}, ${badge} yeni` : tab.title}
        onPress={() => {
          if (!focused) onPress();
        }}
        testID={`tab-${id}`}
        style={styles.item}>
        <View>
          <Icon name={icons[tab.name] ?? 'circle'} size={22} color={focused ? 'white' : '#9FB3CF'} />
          {badge != null ? (
            <View style={[styles.badge, focused && styles.badgeOnActive]} testID={`tab-${id}-badge`}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {focused ? (
          <Animated.View style={[styles.labelClip, labelStyle]}>
            <Text numberOfLines={1} ellipsizeMode="clip" style={styles.label}>
              {tab.title}
            </Text>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    paddingHorizontal: BAR_PADDING,
    borderRadius: 24,
    backgroundColor: Colors.navy,
    boxShadow: '0 8px 24px rgba(10, 33, 63, 0.28)',
  },
  // Kayan yeşil hap: aktif sekmenin altında durur, sekme değişince yeni sekmeye kayar.
  pill: {
    position: 'absolute',
    left: BAR_PADDING,
    top: (BAR_HEIGHT - ITEM_HEIGHT) / 2,
    height: ITEM_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Colors.green,
  },
  // Genişlik animasyonu sırasında yazı sekmenin dışına taşmaz.
  item: {
    height: ITEM_HEIGHT,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  labelClip: { overflow: 'hidden' },
  label: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.white },
  badge: {
    position: 'absolute',
    top: -7,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.orange,
    borderWidth: 2,
    borderColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOnActive: { borderColor: Colors.green },
  badgeText: { fontFamily: Fonts.bold, fontSize: 10, lineHeight: 12, color: Colors.white },
});
