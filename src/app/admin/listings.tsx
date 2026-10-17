import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListingImage } from '@/components/listing-image';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Badge, Card, Chip } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAdminListings } from '@/features/admin/api';
import { formatPrice, statusLabels, statusTones, timeAgo } from '@/lib/format';
import type { ListingStatus } from '@/types/database';

const filters: (ListingStatus | null)[] = [null, 'draft', 'published', 'reserved', 'sold', 'unpublished'];

export default function AdminListingsScreen() {
  const [status, setStatus] = useState<ListingStatus | null>(null);
  const listings = useAdminListings(status);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="İlan Yönetimi"
        right={
          <Pressable
            hitSlop={12}
            accessibilityLabel="Yeni ilan"
            style={styles.add}
            onPress={() => router.push('/admin/listing-form')}>
            <Icon name="plus" size={24} color="white" />
          </Pressable>
        }>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {filters.map((s) => (
            <Chip
              key={s ?? 'all'}
              label={s ? statusLabels[s] : 'Tümü'}
              selected={status === s}
              onPress={() => setStatus(s)}
            />
          ))}
        </ScrollView>
      </ScreenHeader>

      <FlatList
        data={listings.data ?? []}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        onRefresh={() => void listings.refetch()}
        refreshing={listings.isRefetching}
        renderItem={({ item }) => (
          <Card>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/admin/listing-form', params: { id: item.id } })}>
              <ListingImage uri={item.cover_url} style={styles.thumb} iconSize={20} />
              <View style={styles.flex}>
                <Text variant="bodySemibold" color="heading" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text variant="small">
                  #{item.listing_no} · {item.photo_count} foto · {timeAgo(item.updated_at)}
                </Text>
                <View style={styles.bottom}>
                  <Text variant="price" style={styles.flex} numberOfLines={1}>
                    {formatPrice(item.price, item.currency)}
                  </Text>
                  <Badge label={statusLabels[item.status]} tone={statusTones[item.status]} />
                </View>
              </View>
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={
          listings.isLoading ? (
            <StateView loading />
          ) : (
            <StateView
              top
              icon="inbox"
              title={status ? `${statusLabels[status]} ilan yok` : 'Henüz ilan yok'}
              actions={[
                { title: 'Yeni İlan Ekle', icon: 'plus', variant: 'primary', onPress: () => router.push('/admin/listing-form') },
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
  flex: { flex: 1 },
  add: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { gap: Spacing.two },
  list: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  row: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.two + 2 },
  pressed: { backgroundColor: Colors.background },
  thumb: { width: 92, height: 80, borderRadius: Radius.md },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
});
