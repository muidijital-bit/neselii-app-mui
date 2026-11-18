import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney, sectorById, userMessage, type VehiclePackage } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { Text } from '@/ui/Text';
import { Badge, Card } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { NEW_PACKAGE, packageEditHref, packageHref } from './routes';
import { usePackagesQuery } from './usePackages';

/** Madde 45: araç paketleri (ör. "Şantiye paketi"). Kartta araç sayısı, toplam fiyat ve kapak görselleri; yönetici taslakları da görür ve ekler. */
export function PackagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAdmin = useIsAdmin();
  const query = usePackagesQuery();
  const { refetch } = query;
  const { pulling, onRefresh } = usePullRefresh(refetch);
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  let empty = null;
  if (query.isPending) {
    empty = (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  } else if (query.isError && !query.data) {
    empty = <StateMessage icon="wifi-off" title="Paketler yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="packages-error" />;
  } else {
    empty = <StateMessage top icon="package" title="Henüz paket yok" message="Projeye özel araç paketleri yakında burada olacak." testID="packages-empty" />;
  }

  return (
    <View style={styles.container} testID="packages-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Araç Paketleri" testID="packages-back" right={<AdminBadge />} />
      <FlatList
        style={styles.flex}
        contentContainerStyle={[styles.list, isAdmin && { paddingBottom: insets.bottom + 96 }]}
        data={query.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PackageCard pkg={item} onPress={() => router.push(packageHref(item.id))} />}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
      />
      {isAdmin ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
          <Button title="Yeni Paket" icon="plus" onPress={() => router.push(packageEditHref(NEW_PACKAGE))} testID="packages-new" />
        </View>
      ) : null}
    </View>
  );
}

function PackageCard({ pkg, onPress }: { pkg: VehiclePackage; onPress: () => void }) {
  return (
    <Card>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]} testID={`package-${pkg.id}`}>
        <View style={styles.thumbs}>
          {pkg.listings.slice(0, 3).map((l) => (
            <ListingImage key={l.id} uri={l.coverImageUri} style={styles.thumb} iconSize={18} />
          ))}
        </View>
        <View style={styles.head}>
          <Text variant="subheading" style={styles.flex}>
            {pkg.title}
          </Text>
          {pkg.published ? null : <Badge label="Taslak" tone="warning" />}
        </View>
        <Text variant="small">
          {pkg.sector ? `${sectorById(pkg.sector).label} · ` : ''}
          {pkg.listings.length} araç · toplam {formatMoney({ amountKurus: pkg.totalPriceKurus, currency: 'TRY' })}
        </Text>
        <View style={styles.more}>
          <Text variant="smallSemibold" color="green">
            Paketi incele
          </Text>
          <Icon name="arrow-right" size={16} color="green" />
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  list: { flexGrow: 1, padding: Spacing.three, gap: Spacing.three },
  card: { padding: Spacing.three, gap: Spacing.one + 2 },
  pressed: { backgroundColor: Colors.background },
  thumbs: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.one },
  thumb: { flex: 1, height: 70, borderRadius: Radius.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  more: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
