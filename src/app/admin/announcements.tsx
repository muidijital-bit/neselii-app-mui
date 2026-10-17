import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Badge, Card } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAdminAnnouncements } from '@/features/admin/api';
import { timeAgo } from '@/lib/format';

export default function AdminAnnouncementsScreen() {
  const announcements = useAdminAnnouncements();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Duyurular"
        right={
          <Pressable
            hitSlop={12}
            accessibilityLabel="Yeni duyuru"
            style={styles.add}
            onPress={() => router.push('/admin/announcement-form')}>
            <Icon name="plus" size={24} color="white" />
          </Pressable>
        }
      />
      <FlatList
        data={announcements.data ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        onRefresh={() => void announcements.refetch()}
        refreshing={announcements.isRefetching}
        renderItem={({ item }) => (
          <Card>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/admin/announcement-form', params: { id: item.id } })}>
              <View style={styles.flex}>
                <Text variant="subheading" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text variant="small" numberOfLines={2}>
                  {item.body}
                </Text>
                <Text variant="caption">
                  {item.published_at ? `Yayımlandı · ${timeAgo(item.published_at)}` : `Oluşturuldu · ${timeAgo(item.created_at)}`}
                </Text>
              </View>
              <Badge label={item.published_at ? 'Yayında' : 'Taslak'} tone={item.published_at ? 'success' : 'neutral'} />
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={
          announcements.isLoading ? (
            <StateView loading />
          ) : (
            <StateView
              top
              icon="mci:bullhorn-outline"
              title="Henüz duyuru yok"
              message="Yayımladığınız duyurular, duyuru bildirimini açan kullanıcılara bildirim olarak gider."
              actions={[
                { title: 'Duyuru Yaz', icon: 'plus', variant: 'primary', onPress: () => router.push('/admin/announcement-form') },
              ]}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1, gap: Spacing.one },
  add: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, padding: Spacing.three },
  pressed: { backgroundColor: Colors.background },
});
