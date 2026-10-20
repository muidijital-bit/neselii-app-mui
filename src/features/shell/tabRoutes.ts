import type { TabKey } from '@/components/TabBar';

/** Expo Router sekme rota adı ↔ TabBar anahtarı. */
export const TAB_ROUTES: Record<string, TabKey> = {
  index: 'home',
  categories: 'categories',
  messages: 'messages',
  notifications: 'notifications',
  profile: 'profile',
};

export const ROUTE_BY_TAB: Record<TabKey, string> = {
  home: 'index',
  categories: 'categories',
  messages: 'messages',
  notifications: 'notifications',
  profile: 'profile',
};
