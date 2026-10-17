import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName, activeName: IconName) {
  return function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? activeName : name} color={color as string} size={size} />;
  };
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'İlanlar', tabBarIcon: tabIcon('car-sport-outline', 'car-sport') }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: 'Favoriler', tabBarIcon: tabIcon('heart-outline', 'heart') }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Mesajlar', tabBarIcon: tabIcon('chatbubbles-outline', 'chatbubbles') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: tabIcon('person-outline', 'person') }}
      />
    </Tabs>
  );
}
