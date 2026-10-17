import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Divider, IconTile } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/api';
import { formatPrice, statusLabels, timeAgo } from '@/lib/format';
import type { NotificationRow, NotificationType } from '@/types/database';

const typeStyles: Record<NotificationType, { icon: IconName; bg: string; color: string }> = {
  new_listing: { icon: 'tag', bg: '#E2F5E9', color: Colors.green },
  message_reply: { icon: 'message-circle', bg: '#DCE6F2', color: Colors.heading },
  price_change: { icon: 'trending-down', bg: Colors.warningSoft, color: Colors.warning },
  status_change: { icon: 'refresh-cw', bg: Colors.chip, color: Colors.textSecondary },
  announcement: { icon: 'mci:bullhorn-outline', bg: Colors.surfaceMuted, color: Colors.heading },
};

function detail(n: NotificationRow) {
  const parts: string[] = [];
  if (n.type === 'price_change' && n.data.old_price != null && n.data.new_price != null) {
    parts.push(`${formatPrice(n.data.old_price)} → ${formatPrice(n.data.new_price)}`);
  } else if (n.type === 'status_change' && n.data.old_status && n.data.new_status) {
    parts.push(`${statusLabels[n.data.old_status]} → ${statusLabels[n.data.new_status]}`);
  } else if (n.body) {
    parts.push(n.body);
  }
  parts.push(timeAgo(n.created_at));
  return parts.join(' · ');
}

function open(n: NotificationRow) {
  if (n.conversation_id) router.push({ pathname: '/chat/[id]', params: { id: n.conversation_id } });
  else if (n.announcement_id) router.push({ pathname: '/announcement/[id]', params: { id: n.announcement_id } });
  else if (n.listing_id && n.data.new_status !== 'unpublished')
    router.push({ pathname: '/listing/[id]', params: { id: n.listing_id } });
}

export default function NotificationsScreen() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const hasUnread = notifications.data?.some((n) => !n.read_at) ?? false;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Bildirimler"
        back={false}
        right={
          hasUnread ? (
            <Pressable hitSlop={8} onPress={() => markAllRead.mutate()}>
              <Text variant="bodySemibold" color="heading">
                Tümünü oku
              </Text>
            </Pressable>
          ) : null
        }
      />
      <FlatList
        data={notifications.data ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        onRefresh={() => void notifications.refetch()}
        refreshing={notifications.isRefetching}
        ItemSeparatorComponent={() => <Divider />}
        renderItem={({ item }) => {
          const style = typeStyles[item.type];
          const unread = !item.read_at;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, unread && styles.unread, pressed && styles.pressed]}
              onPress={() => {
                if (unread) markRead.mutate(item.id);
                open(item);
              }}>
              <IconTile icon={style.icon} bg={style.bg} color={style.color} />
              <View style={styles.flex}>
                <Text variant="bodyMedium">{item.title}</Text>
                <Text variant="small">{detail(item)}</Text>
              </View>
              {unread ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          notifications.isLoading ? (
            <StateView loading />
          ) : (
            <StateView
              top
              icon="bell"
              title="Bildiriminiz yok"
              message="Favori ilanlarınızda fiyat veya durum değiştiğinde, mesajınıza cevap geldiğinde burada görürsünüz."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  list: { flexGrow: 1 },
  flex: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  unread: { backgroundColor: Colors.surfaceHighlight },
  pressed: { opacity: 0.8 },
  dot: { width: 10, height: 10, borderRadius: Radius.pill, backgroundColor: Colors.green, marginTop: 8 },
});
