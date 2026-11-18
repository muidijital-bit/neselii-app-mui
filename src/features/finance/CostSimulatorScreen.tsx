import { useQueries } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { LOAD_LEVELS, asListingId, formatInteger, formatMoney, isSafeEntityId, ownershipCost, type LoadLevel } from '@/domain';
import { listingsKeys } from '@/features/listings/useListingsQueries';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card, Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useFinanceSettings } from './useFinance';

const tl = (kurus: number) => formatMoney({ amountKurus: kurus, currency: 'TRY' });
const num = (text: string) => {
  const d = text.replace(/\D/g, '');
  return d ? Number(d) : 0;
};

/**
 * Madde 42: lojistik maliyet simülatörü. Rota (sefer km'si ve aylık sefer), yük durumu ve yakıt fiyatı girilir; karşılaştırmadaki araçların
 * yıllık / aylık işletme maliyeti ve km başı maliyeti yan yana, en düşük maliyetli vurgulu. Tüketim kategorinin varsayılanı × yük çarpanıdır.
 */
export function CostSimulatorScreen() {
  const { ids } = useLocalSearchParams<{ ids?: string | string[] }>();
  const listingIds = typeof ids === 'string' ? ids.split(',').filter(isSafeEntityId).slice(0, 3) : [];
  const { listings } = useServices();
  const { session } = useSession();
  const settings = useFinanceSettings();
  const queries = useQueries({
    queries: listingIds.map((id) => ({ queryKey: listingsKeys.detail(session?.user.id ?? null, id), queryFn: () => listings.getListing(asListingId(id)) })),
  });
  const [tripKm, setTripKm] = useState('450');
  const [trips, setTrips] = useState('16');
  const [load, setLoad] = useState<LoadLevel>('mixed');
  const [fuel, setFuel] = useState(settings.data ? String(settings.data.costs.fuelPriceTl).replace('.', ',') : '');

  const details = queries.flatMap((q) => (q.data ? [q.data] : []));
  const factor = LOAD_LEVELS.find((l) => l.id === load)?.factor ?? 1;
  const annualKm = num(tripKm) * num(trips) * 12;
  const fuelPrice = Number(fuel.replace(',', '.')) || settings.data?.costs.fuelPriceTl || 0;
  const rows =
    settings.data
      ? details
          .map((d) => {
            const base = settings.data!.costs.fuelConsumption[d.categoryId] ?? 30;
            const cost = ownershipCost(
              { priceKurus: d.price.amountKurus, annualKm, consumption: base * factor, financed: false },
              { ...settings.data!, costs: { ...settings.data!.costs, fuelPriceTl: fuelPrice } },
            );
            return { detail: d, cost, consumption: base * factor };
          })
          .sort((a, b) => a.cost.yearlyKurus - b.cost.yearlyKurus)
      : [];

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="cost-simulator-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Lojistik Maliyet Simülatörü" testID="cost-simulator-back" />
      {listingIds.length === 0 ? (
        <StateView icon="info" title="Araç seçilmedi" message="Karşılaştırma listesine araç ekleyip simülatörü oradan açın." />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label="Sefer başı km (rota)" value={tripKm} onChangeText={setTripKm} keyboardType="number-pad" testID="sim-trip-km" />
            </View>
            <View style={styles.flex}>
              <TextField label="Aylık sefer" value={trips} onChangeText={setTrips} keyboardType="number-pad" testID="sim-trips" />
            </View>
          </View>
          <TextField label="Motorin (TL/L)" value={fuel} onChangeText={setFuel} keyboardType="decimal-pad" testID="sim-fuel" />
          <Text variant="smallMedium" color="textSecondary">
            Yük durumu
          </Text>
          <View style={styles.wrap}>
            {LOAD_LEVELS.map((l) => (
              <Chip key={l.id} label={l.label} selected={load === l.id} onPress={() => setLoad(l.id)} />
            ))}
          </View>
          <Text variant="small">Yıllık {formatInteger(annualKm)} km</Text>

          {rows.map(({ detail, cost, consumption }, i) => (
            <Card key={detail.id} style={[styles.card, i === 0 && rows.length > 1 && styles.best]}>
              <Text variant="bodySemibold" numberOfLines={2}>
                {detail.title}
              </Text>
              {i === 0 && rows.length > 1 ? (
                <Text variant="smallSemibold" color="success">
                  En düşük işletme maliyeti
                </Text>
              ) : null}
              <View style={styles.metrics}>
                <Metric label="Yıllık" value={tl(cost.yearlyKurus)} />
                <Metric label="Aylık" value={tl(cost.monthlyKurus)} />
                <Metric label="Km başı" value={tl(cost.perKmKurus)} />
              </View>
              <Text variant="caption">
                Tüketim {consumption.toFixed(1).replace('.', ',')} L/100 km · yakıt {tl(cost.lines.find((l) => l.key === 'fuel')?.yearlyKurus ?? 0)}/yıl
              </Text>
            </Card>
          ))}
          <Text variant="caption">Bakım, lastik, sigorta ve vergi firmamızın ortalama değerleridir; taksit dahil değildir.</Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="caption">{label}</Text>
      <Text variant="smallSemibold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: Spacing.three },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  card: { padding: Spacing.three, gap: Spacing.two },
  best: { borderColor: Colors.green, borderWidth: 2 },
  metrics: { flexDirection: 'row', gap: Spacing.two },
  metric: { flex: 1, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: Spacing.two, gap: 2 },
});
