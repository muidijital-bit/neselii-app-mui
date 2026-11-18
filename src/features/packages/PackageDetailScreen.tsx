import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney, sectorById, userMessage } from '@/domain';
import { fleetQuoteHref } from '@/features/leads/routes';
import { toListingView } from '@/features/listings/presentation';
import { listingHref } from '@/features/listings/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { ListingCard } from '@/ui/ListingCard';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { packageEditHref } from './routes';
import { usePackageQuery } from './usePackages';

/** Madde 45: paket detayı — açıklama, araçlar (ilan kartları), toplam fiyat; müşteride "Bu paket için teklif iste", yöneticide "Düzenle". */
export function PackageDetailScreen() {
  const { packageId } = useLocalSearchParams<{ packageId?: string | string[] }>();
  const id = typeof packageId === 'string' ? packageId : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAdmin = useIsAdmin();
  const query = usePackageQuery(id);
  const pkg = query.data;

  return (
    <View style={styles.container} testID="package-detail-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title={pkg?.title ?? 'Paket'} testID="package-back" />
      {query.isPending ? (
        <StateView loading />
      ) : !pkg ? (
        <StateView icon="alert-circle" title="Paket bulunamadı" message={userMessage(query.error)} />
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}>
            <View style={styles.meta}>
              <Badge label={pkg.sector ? sectorById(pkg.sector).label : 'Genel'} tone="info" />
              {pkg.published ? null : <Badge label="Taslak" tone="warning" />}
            </View>
            {pkg.description ? <Text variant="body">{pkg.description}</Text> : null}
            <Text variant="subheading">
              {pkg.listings.length} araç · toplam {formatMoney({ amountKurus: pkg.totalPriceKurus, currency: 'TRY' })}
            </Text>
            {pkg.listings.map((listing) => (
              <ListingCard key={listing.id} listing={toListingView(listing)} onPress={() => router.push(listingHref(listing.id))} testID={`package-listing-${listing.id}`} />
            ))}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
            {isAdmin ? (
              <Button title="Paketi Düzenle" icon="edit-2" variant="outline" onPress={() => router.push(packageEditHref(pkg.id))} testID="package-edit" />
            ) : (
              <Button
                title="Bu paket için teklif iste"
                icon="layers"
                disabled={pkg.listings.length === 0}
                onPress={() => router.push(fleetQuoteHref(pkg.listings.map((l) => l.id)))}
                testID="package-quote"
              />
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three },
  meta: { flexDirection: 'row', gap: Spacing.two },
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
