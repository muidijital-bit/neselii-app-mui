import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { asListingId, type ListingDetail } from '@/domain';
import { useFinanceSettings } from '@/features/finance/useFinance';
import { costSimulatorHref } from '@/features/finance/routes';
import { fleetQuoteHref } from '@/features/leads/routes';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { Button } from '@/ui/Button';
import { StateMessage } from '@/features/listings/ListStates';
import { listingHref } from '@/features/listings/routes';
import { listingsKeys } from '@/features/listings/useListingsQueries';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { compareRows } from './compareRows';
import { useCompare } from './CompareProvider';

/**
 * Araç karşılaştırma (madde 4): listedeki en çok 3 ilan yan yana. Üstte fotoğraf, başlık ve "çıkar"; altında her özellik satırı ilanlar için
 * eşit sütunlarda. Farklı olan satırlar vurgulanır. İlan detayları ilan detayıyla aynı önbellekten okunur.
 */
export function CompareScreen() {
  const router = useRouter();
  const { ids, remove, clear } = useCompare();
  const { listings } = useServices();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const finance = useFinanceSettings();
  const queries = useQueries({
    queries: ids.map((id) => ({ queryKey: listingsKeys.detail(userId, id), queryFn: () => listings.getListing(asListingId(id)) })),
  });

  const loading = queries.some((q) => q.isPending);
  const details = queries.flatMap((q) => (q.data && q.data.status !== 'withdrawn' ? [q.data] : []));
  const rows = compareRows(details, finance.data);
  const isAdmin = useIsAdmin();

  return (
    <View style={styles.container} testID="compare-screen">
      <FocusStatusBar style="dark" />
      <PageHeader
        title="Karşılaştır"
        testID="compare-back"
        right={
          ids.length ? (
            <Pressable hitSlop={12} accessibilityRole="button" onPress={clear} testID="compare-clear">
              <Text variant="bodySemibold" color="green">
                Temizle
              </Text>
            </Pressable>
          ) : null
        }
      />
      {ids.length === 0 ? (
        <StateMessage
          top
          icon="mci:compare-horizontal"
          title="Karşılaştırma listeniz boş"
          message="İlan detayındaki karşılaştır düğmesiyle en fazla 3 ilan ekleyip yan yana inceleyebilirsiniz."
          actionLabel="İlanlara göz at"
          actionIcon="search"
          onAction={() => router.navigate('/')}
          testID="compare-empty"
        />
      ) : loading && details.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.navy} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headRow}>
            {details.map((detail) => (
              <ListingColumn key={detail.id} detail={detail} onOpen={() => router.push(listingHref(detail.id))} onRemove={() => remove(detail.id)} />
            ))}
          </View>
          {details.length === 1 ? (
            <Text variant="small" align="center" style={styles.hint}>
              Karşılaştırmak için bir ilan daha ekleyin.
            </Text>
          ) : null}
          <View style={styles.table}>
            {rows.map((row) => (
              <View key={row.key} style={[styles.row, row.differs && styles.rowDiffers]} testID={`compare-row-${row.key}`}>
                <Text variant="caption" style={styles.rowLabel}>
                  {row.label}
                </Text>
                <View style={styles.cells}>
                  {row.values.map((value, i) => (
                    <Text key={`${row.key}-${i}`} variant={row.differs ? 'smallSemibold' : 'small'} color="text" style={styles.cell}>
                      {value}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
          {/* Madde 42: seçilen araçların işletme maliyetini karşılaştırma. */}
          {details.length > 0 ? (
            <Button title="Lojistik maliyet simülasyonu" icon="bar-chart-2" variant="outline" onPress={() => router.push(costSimulatorHref(details.map((d) => d.id)))} testID="compare-cost-simulator" />
          ) : null}
          {/* Madde 44: seçilen araçlar için tek toplu teklif talebi. */}
          {!isAdmin && details.length > 1 ? (
            <Button
              title={`${details.length} araç için toplu teklif iste`}
              icon="layers"
              variant="navy"
              onPress={() => router.push(fleetQuoteHref(details.map((d) => d.id)))}
              testID="compare-fleet-quote"
            />
          ) : null}
          <Text variant="caption" align="center">
            Vurgulu satırlar ilanlar arasında farklı olan özelliklerdir. Aylık ödeme tahminidir.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

function ListingColumn({ detail, onOpen, onRemove }: { detail: ListingDetail; onOpen: () => void; onRemove: () => void }) {
  return (
    <View style={styles.column}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${detail.title}, ilanı aç`} onPress={onOpen}>
        <ListingImage uri={detail.coverImageUri} style={styles.image} iconSize={28} />
        <Text variant="smallSemibold" numberOfLines={3} style={styles.title}>
          {detail.title}
        </Text>
      </Pressable>
      <Pressable
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${detail.title}, karşılaştırmadan çıkar`}
        onPress={onRemove}
        style={styles.remove}
        testID={`compare-remove-${detail.id}`}>
        <Icon name="x" size={16} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  headRow: { flexDirection: 'row', gap: Spacing.two },
  column: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 4 / 3 },
  title: { padding: Spacing.two },
  remove: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(10,33,63,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { marginTop: -Spacing.one },
  table: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, gap: Spacing.one, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rowDiffers: { backgroundColor: Colors.surfaceHighlight },
  rowLabel: { textTransform: 'uppercase', letterSpacing: 0.4 },
  cells: { flexDirection: 'row', gap: Spacing.two },
  cell: { flex: 1 },
});
