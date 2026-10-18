import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { Colors } from '@/constants/theme';
import { useUnreadMessageCount } from '@/features/messages/api';
import { useRealtimeBadges, useUnreadNotificationCount } from '@/features/notifications/api';

function badge(count: number | undefined) {
  return count ? (count > 99 ? '99+' : count) : undefined;
}

export default function TabsLayout() {
  useRealtimeBadges();
  const unreadMessages = useUnreadMessageCount();
  const unreadNotifications = useUnreadNotificationCount();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}>
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="categories" options={{ title: 'Kategoriler' }} />
      <Tabs.Screen name="messages" options={{ title: 'Mesajlar', tabBarBadge: badge(unreadMessages.data) }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Bildirimler', tabBarBadge: badge(unreadNotifications.data) }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
