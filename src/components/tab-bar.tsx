import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

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

/**
 * Yüzen lacivert alt menü: aktif sekme yeşil bir hap içinde simge + yazıyla genişler,
 * diğerleri yalnızca simge olarak durur.
 */
export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomGap(insets.bottom) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title ?? route.name;
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${label}, ${badge} yeni` : label}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={[styles.item, focused && styles.itemActive]}>
              <View>
                <Icon name={icons[route.name] ?? 'circle'} size={22} color={focused ? 'white' : '#9FB3CF'} />
                {badge != null ? (
                  <View style={[styles.badge, focused && styles.badgeOnActive]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              {focused ? (
                <Text numberOfLines={1} style={styles.label}>
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
    paddingHorizontal: 8,
    borderRadius: 24,
    backgroundColor: Colors.navy,
    boxShadow: '0 8px 24px rgba(10, 33, 63, 0.28)',
  },
  item: {
    flex: 1,
    height: 48,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  itemActive: { flex: 2.2, backgroundColor: Colors.green },
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
