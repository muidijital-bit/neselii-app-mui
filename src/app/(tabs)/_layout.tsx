import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Colors, Fonts } from '@/constants/theme';
import { useUnreadMessageCount } from '@/features/messages/api';
import { useRealtimeBadges, useUnreadNotificationCount } from '@/features/notifications/api';

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color as string} size={26} />;
  };
}

function badge(count: number | undefined) {
  return count ? (count > 99 ? '99+' : count) : undefined;
}

export default function TabsLayout() {
  useRealtimeBadges();
  const unreadMessages = useUnreadMessageCount();
  const unreadNotifications = useUnreadNotificationCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.heading,
        tabBarInactiveTintColor: '#6B7480',
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 12 },
        tabBarBadgeStyle: { backgroundColor: Colors.danger, fontFamily: Fonts.bold, fontSize: 11 },
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="categories" options={{ title: 'Kategoriler', tabBarIcon: tabIcon('grid') }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarIcon: tabIcon('message-circle'),
          tabBarBadge: badge(unreadMessages.data),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarIcon: tabIcon('bell'),
          tabBarBadge: badge(unreadNotifications.data),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
