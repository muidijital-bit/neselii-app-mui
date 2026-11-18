import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { formatInteger, formatMoney, profitability, userMessage, type FinanceSettings, type ListingDetail } from '@/domain';
import { useListingQuery } from '@/features/listings/useListingsQueries';
import { PageHeader } from '@/features/notifications/PageHeader';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useFinanceSettings } from './useFinance';

const tl = (kurus: number) => formatMoney({ amountKurus: Math.abs(kurus), currency: 'TRY' });
const num = (text: string) => {
  const d = text.replace(/\D/g, '');
  return d ? Number(d) : 0;
};
const grouped = (text: string) => (num(text) ? formatInteger(num(text)) : '');

/**
 * Madde 25: amortisman ve kârlılık hesabı. Aylık sefer sayısı, sefer başı gelir ve km, tüketim, şoför ve diğer giderler girilir; firmanın maliyet
 * varsayılanlarıyla aylık gider, (kredili alımda) taksit, aylık net kazanç ve aracın kendini kaç ayda amorti edeceği hesaplanır.
 */
export function ProfitScreen() {
  const { listingId } = useLocalSearchParams<{ listingId?: string | string[] }>();
  const id = typeof listingId === 'string' ? listingId : '';
  const listing = useListingQuery(id);
  const settings = useFinanceSettings();
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="profit-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Kârlılık Hesabı" subtitle={listing.data?.title} testID="profit-back" />
      {listing.isPending || settings.isPending ? (
        <StateView loading />
      ) : listing.data && settings.data ? (
        <ProfitForm listing={listing.data} settings={settings.data} />
      ) : (
        <StateView title="Hesaplama yüklenemedi" message={userMessage(listing.error ?? settings.error)} />
      )}
    </KeyboardAvoidingView>
  );
}

function ProfitForm({ listing, settings }: { listing: ListingDetail; settings: FinanceSettings }) {
  const [trips, setTrips] = useState('20');
  const [revenue, setRevenue] = useState('25.000');
  const [km, setKm] = useState('500');
  const [consumption, setConsumption] = useState(String(settings.costs.fuelConsumption[listing.categoryId] ?? 30));
  const [driver, setDriver] = useState('45.000');
  const [other, setOther] = useState('10.000');
  const [financed, setFinanced] = useState(false);

  const result = profitability(
    {
      priceKurus: listing.price.amountKurus,
      tripsPerMonth: num(trips),
      revenuePerTripKurus: num(revenue) * 100,
      kmPerTrip: num(km),
      consumption: Number(consumption.replace(',', '.')) || 0,
      driverMonthlyKurus: num(driver) * 100,
      otherMonthlyKurus: num(other) * 100,
      financed,
    },
    settings,
  );
  const positive = result.monthlyNetKurus >= 0;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label="Aylık sefer" value={trips} onChangeText={setTrips} keyboardType="number-pad" testID="profit-trips" />
        </View>
        <View style={styles.flex}>
          <TextField label="Sefer başı gelir (TL)" value={revenue} onChangeText={(t) => setRevenue(grouped(t))} keyboardType="number-pad" testID="profit-revenue" />
        </View>
      </View>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label="Sefer başı km" value={km} onChangeText={setKm} keyboardType="number-pad" testID="profit-km" />
        </View>
        <View style={styles.flex}>
          <TextField label="Tüketim (L/100 km)" value={consumption} onChangeText={setConsumption} keyboardType="decimal-pad" testID="profit-consumption" />
        </View>
      </View>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label="Şoför (TL/ay)" value={driver} onChangeText={(t) => setDriver(grouped(t))} keyboardType="number-pad" testID="profit-driver" />
        </View>
        <View style={styles.flex}>
          <TextField label="Diğer gider (TL/ay)" value={other} onChangeText={(t) => setOther(grouped(t))} keyboardType="number-pad" testID="profit-other" />
        </View>
      </View>
      <View style={styles.wrap}>
        <Chip label="Peşin" selected={!financed} onPress={() => setFinanced(false)} />
        <Chip label="Kredili" selected={financed} onPress={() => setFinanced(true)} />
      </View>

      <View style={[styles.result, !positive && styles.resultNegative]} testID="profit-result">
        <Text variant="small">Aylık net kazanç</Text>
        <Text variant="priceLarge" style={{ color: positive ? Colors.success : Colors.danger }} testID="profit-net">
          {positive ? '' : '−'}
          {tl(result.monthlyNetKurus)}
        </Text>
        <Text variant="smallSemibold" color={result.paybackMonths ? 'success' : 'danger'}>
          {result.paybackMonths
            ? `Başa baş: yaklaşık ${result.paybackMonths} ay (${(result.paybackMonths / 12).toFixed(1).replace('.', ',')} yıl)`
            : 'Bu gelirle araç kendini amorti etmiyor'}
        </Text>
      </View>

      <View style={styles.table}>
        <Row label="Aylık gelir" value={tl(result.monthlyRevenueKurus)} />
        <Row label="Aylık işletme gideri" value={`− ${tl(result.monthlyOperatingKurus)}`} hint="Yakıt, bakım, lastik, sigorta, vergi, şoför, diğer" />
        {financed ? <Row label={`Kredi taksiti (${result.plan?.termMonths ?? ''} ay)`} value={`− ${tl(result.monthlyInstallmentKurus)}`} /> : null}
        <Row label="Taksit öncesi net" value={`${result.monthlyNetBeforeFinanceKurus < 0 ? '−' : ''}${tl(result.monthlyNetBeforeFinanceKurus)}`} />
      </View>
      <Text variant="caption">
        Araç bedeli {formatMoney(listing.price)}. Başa baş süresi araç bedelinin taksit öncesi aylık net kazançla karşılanma süresidir; tahminidir.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="body" color="textSecondary">
          {label}
        </Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
      <Text variant="bodySemibold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: Spacing.three },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  result: { backgroundColor: Colors.successSoft, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  resultNegative: { backgroundColor: Colors.dangerSoft },
  table: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
});
