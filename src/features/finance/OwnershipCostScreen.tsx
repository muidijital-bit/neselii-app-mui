import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { formatInteger, formatMoney, ownershipCost, userMessage, type FinanceSettings, type ListingDetail } from '@/domain';
import { useListingQuery } from '@/features/listings/useListingsQueries';
import { PageHeader } from '@/features/notifications/PageHeader';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useFinanceSettings } from './useFinance';

const KM_PRESETS = [50_000, 100_000, 150_000, 200_000];
const tl = (kurus: number) => formatMoney({ amountKurus: kurus, currency: 'TRY' });

/**
 * Toplam sahip olma maliyeti (madde 24): yıllık km ve tüketim girilir; yakıt, bakım, lastik, sigorta, vergi (firmanın varsayılanları) ve kredili
 * alımda ilk yılın taksitleriyle yıllık ve aylık maliyet hesaplanır.
 */
export function OwnershipCostScreen() {
  const { listingId } = useLocalSearchParams<{ listingId?: string | string[] }>();
  const id = typeof listingId === 'string' ? listingId.trim() : '';
  const listing = useListingQuery(id);
  const settings = useFinanceSettings();

  let body;
  if (listing.isPending || settings.isPending) body = <StateView loading />;
  else if (!listing.data || !settings.data)
    body = (
      <StateView
        title="Hesaplama yüklenemedi"
        message={userMessage(listing.error ?? settings.error)}
        actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void Promise.all([listing.refetch(), settings.refetch()]) }]}
      />
    );
  else body = <CostForm listing={listing.data} settings={settings.data} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="ownership-cost-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Sahip Olma Maliyeti" subtitle={listing.data?.title} testID="ownership-cost-back" />
      {body}
    </KeyboardAvoidingView>
  );
}

const parseDecimal = (text: string) => {
  const value = Number(text.replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(value) ? value : 0;
};

function CostForm({ listing, settings }: { listing: ListingDetail; settings: FinanceSettings }) {
  const defaultConsumption = settings.costs.fuelConsumption[listing.categoryId] ?? 0;
  const [km, setKm] = useState('100000');
  const [consumption, setConsumption] = useState(String(defaultConsumption).replace('.', ','));
  const [financed, setFinanced] = useState(false);
  const annualKm = Number(km.replace(/\D/g, '')) || 0;
  const cost = ownershipCost({ priceKurus: listing.price.amountKurus, annualKm, consumption: parseDecimal(consumption), financed }, settings);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.group}>
        <Text variant="smallMedium" color="textSecondary">
          Yıllık kilometre
        </Text>
        <View style={styles.wrap}>
          {KM_PRESETS.map((preset) => (
            <Chip key={preset} label={`${formatInteger(preset)} km`} selected={annualKm === preset} onPress={() => setKm(String(preset))} />
          ))}
        </View>
        <TextField value={km ? formatInteger(annualKm) : ''} onChangeText={setKm} keyboardType="number-pad" placeholder="Ör. 120.000" testID="ownership-km" />
      </View>
      <TextField
        label="Ortalama tüketim (litre / 100 km)"
        value={consumption}
        onChangeText={setConsumption}
        keyboardType="decimal-pad"
        helper={`Motorin ${String(settings.costs.fuelPriceTl).replace('.', ',')} TL / litre ile hesaplanır.`}
        testID="ownership-consumption"
      />
      <View style={styles.group}>
        <Text variant="smallMedium" color="textSecondary">
          Alım şekli
        </Text>
        <View style={styles.wrap}>
          <Chip label="Peşin" selected={!financed} onPress={() => setFinanced(false)} />
          <Chip label="Kredili" selected={financed} onPress={() => setFinanced(true)} />
        </View>
      </View>

      <View style={styles.result} testID="ownership-result">
        <Text variant="small">Tahmini aylık maliyet</Text>
        <Text variant="priceLarge" style={styles.monthly} testID="ownership-monthly">
          {tl(cost.monthlyKurus)}
        </Text>
        <Text variant="smallSemibold" color="success">
          Yıllık {tl(cost.yearlyKurus)}
          {annualKm > 0 ? ` · km başına ${tl(cost.perKmKurus)} (taksit hariç)` : ''}
        </Text>
      </View>

      <View style={styles.table}>
        {cost.lines.map((line) => (
          <View key={line.key} style={styles.row} testID={`ownership-line-${line.key}`}>
            <Text variant="body" color="textSecondary" style={styles.flex}>
              {line.label}
            </Text>
            <View style={styles.amounts}>
              <Text variant="bodySemibold">{tl(line.yearlyKurus)}</Text>
              <Text variant="caption">aylık {tl(Math.round(line.yearlyKurus / 12))}</Text>
            </View>
          </View>
        ))}
      </View>
      {cost.plan ? (
        <Text variant="caption">
          Kredi: %{settings.minDownPaymentPercent} peşinat ({tl(cost.plan.downPaymentKurus)}), {cost.plan.termMonths} ay, aylık {tl(cost.plan.monthlyPaymentKurus)}. Peşinat yıllık maliyete dahil değildir.
        </Text>
      ) : null}
      <Text variant="caption">Bakım, lastik, sigorta ve vergi firmamızın ortalama değerleridir; gerçek maliyet kullanıma göre değişir.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  group: { gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  result: { backgroundColor: Colors.successSoft, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  monthly: { color: Colors.success },
  table: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  amounts: { alignItems: 'flex-end' },
});
