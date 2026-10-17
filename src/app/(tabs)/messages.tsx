import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListingImage } from '@/components/listing-image';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { CountBadge, Divider } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useConversations } from '@/features/messages/api';
import { timeAgo } from '@/lib/format';

export default function MessagesScreen() {
  const conversations = useConversations();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mesajlar" back={false} />
      <FlatList
        data={conversations.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={() => void conversations.refetch()}
        refreshing={conversations.isRefetching}
        ListHeaderComponent={
          <View style={styles.info}>
            <Icon name="info" size={18} />
            <Text variant="small" color="heading" style={styles.flex}>
              Tüm görüşmeleriniz Neşeli Otomotiv ile ve bir ilana bağlıdır.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <Divider />}
        renderItem={({ item }) => {
          const unread = item.unread_count > 0;
          const preview = item.last_message
            ? `${item.last_message_is_staff ? '' : 'Siz: '}${item.last_message}`
            : 'Görüşme başlatıldı';
          return (
            <Link href={{ pathname: '/chat/[id]', params: { id: item.id } }} asChild>
              <Pressable style={({ pressed }) => [styles.row, unread && styles.unread, pressed && styles.pressed]}>
                <ListingImage uri={item.listing?.cover_url} style={styles.thumb} iconSize={20} />
                <View style={styles.flex}>
                  <View style={styles.line}>
                    <Text variant={unread ? 'subheading' : 'bodyMedium'} numberOfLines={1} style={styles.flex}>
                      {item.listing?.title ?? 'İlan kaldırıldı'}
                    </Text>
                    <Text variant={unread ? 'smallSemibold' : 'small'} color={unread ? 'green' : 'textSecondary'}>
                      {timeAgo(item.last_message_at)}
                    </Text>
                  </View>
                  <View style={styles.line}>
                    <Text variant="small" numberOfLines={1} style={styles.flex}>
                      {preview}
                    </Text>
                    <CountBadge count={item.unread_count} tone="green" />
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        }}
        ListEmptyComponent={
          conversations.isLoading ? (
            <StateView loading />
          ) : (
            <StateView
              top
              icon="message-circle"
              title="Henüz mesajınız yok"
              message="İlan sayfasındaki Mesaj Gönder butonuyla firmaya ilan hakkında soru sorabilirsiniz."
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
  flex: { flex: 1 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  unread: { backgroundColor: Colors.surfaceHighlight },
  pressed: { opacity: 0.8 },
  thumb: { width: 64, height: 64, borderRadius: Radius.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 26 },
});
