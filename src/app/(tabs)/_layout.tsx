import { Tabs, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';

import { useUnreadCountQuery } from '@/features/messaging';
import { useNotificationUnreadCountQuery } from '@/features/notifications';
import { TabBar } from '@/ui/TabBar';
import { Colors } from '@/ui/theme';

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;

/** Mesajlar ve Bildirimler rozetleri servisin okunmamış toplamlarıdır (liste satır sayaçlarıyla aynı kaynak); yüklenene/hata verene kadar rozet yok. */
function TabBarWithCounts({ activeRoute, navigate }: { activeRoute: string; navigate: (routeName: string) => void }) {
  const unread = useUnreadCountQuery();
  const notificationsUnread = useNotificationUnreadCountQuery();
  return (
    <TabBar
      active={activeRoute}
      onSelect={navigate}
      tabs={[
        { name: 'index', title: 'Ana Sayfa' },
        { name: 'categories', title: 'Kategoriler' },
        { name: 'messages', title: 'Mesajlar', count: unread.data ?? 0 },
        { name: 'notifications', title: 'Bildirimler', count: notificationsUnread.data ?? 0 },
        { name: 'profile', title: 'Profil' },
      ]}
    />
  );
}

/**
 * Sekmeye geçiş React Navigation'ın standart özel sekme çubuğu düzeniyle: önce `tabPress` olayı yayılır (ekranlar engelleyebilir),
 * engellenmezse sekmeye gidilir. Rota `state.routes` içinde yoksa sekmeye yol (href) ile gidilir.
 */
function RouterTabBar({ state, navigation }: Parameters<TabBarRenderer>[0]) {
  const router = useRouter();
  return (
    <TabBarWithCounts
      activeRoute={state.routes[state.index]?.name ?? 'index'}
      navigate={(routeName) => {
        const route = state.routes.find((candidate) => candidate.name === routeName);
        if (!route) {
          router.navigate(TAB_HREF[routeName] ?? '/');
          return;
        }
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
      }}
    />
  );
}

const TAB_HREF: Record<string, Href> = {
  index: '/',
  categories: '/categories',
  messages: '/messages',
  notifications: '/notifications',
  profile: '/profile',
};

const renderTabBar: TabBarRenderer = (props) => <RouterTabBar {...props} />;

export default function TabsLayout() {
  return (
    <Tabs tabBar={renderTabBar} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
