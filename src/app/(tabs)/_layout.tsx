import { Tabs, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';

import { TabBar } from '@/components/TabBar';
import { useUnreadCountQuery } from '@/features/messaging';
import { useNotificationUnreadCountQuery } from '@/features/notifications';
import { ROUTE_BY_TAB, TAB_ROUTES } from '@/features/shell';

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;

/** Mesajlar ve Bildirimler rozetleri servisin okunmamış toplamlarıdır (liste satır sayaçlarıyla aynı kaynak); yüklenene/hata verene kadar rozet yok. */
function TabBarWithCounts({ activeRoute, navigate }: { activeRoute: string; navigate: (routeName: string) => void }) {
  const unread = useUnreadCountQuery();
  const notificationsUnread = useNotificationUnreadCountQuery();
  return (
    <TabBar
      active={TAB_ROUTES[activeRoute] ?? 'home'}
      onSelect={(key) => navigate(ROUTE_BY_TAB[key])}
      counts={{ messages: unread.data ?? 0, notifications: notificationsUnread.data ?? 0 }}
    />
  );
}

/**
 * SDK 58 sekme çubuğu props'u: `navigateToTab(routeKey)`. Henüz açılmamış (tembel) sekmeler `state.routes` içinde olmayabilir;
 * o durumda sekmeye yol (href) ile gidilir.
 */
function RouterTabBar({ state, navigateToTab }: Parameters<TabBarRenderer>[0]) {
  const router = useRouter();
  return (
    <TabBarWithCounts
      activeRoute={state.routes[state.index]?.name ?? 'index'}
      navigate={(routeName) => {
        const route = state.routes.find((candidate) => candidate.name === routeName);
        if (route) navigateToTab(route.key);
        else router.navigate(TAB_HREF[routeName] ?? '/');
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
    <Tabs tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
