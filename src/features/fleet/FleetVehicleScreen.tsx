import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppError,
  DEFAULT_RENEWAL_AGE_YEARS,
  DEFAULT_RENEWAL_KM,
  EMPTY_FILTER_DRAFT,
  TRADE_IN_CATEGORIES,
  buildSearch,
  formatInteger,
  formatTrDate,
  parseTrDate,
  renewalDue,
  userMessage,
  type FleetVehicle,
  type TradeInCategory,
} from '@/domain';
import { resultsHref } from '@/features/listings/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { tradeInHref } from '@/features/trade/routes';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { FLEET_HREF, NEW_VEHICLE } from './routes';
import { useFleetMutations, useFleetVehicleQuery } from './useFleet';

/**
 * Filo aracı ekle / düzenle (madde 48–50): plaka, kategori, marka, model, yıl, km; muayene, sigorta ve bakım tarihleri (GG.AA.YYYY); yenileme
 * eşikleri (yaş, km). Yenileme zamanı geldiyse üstte uyarı ve "Benzer araçlara bak" / "Takasa ver" kısayolları. Bildirim tıklaması buraya açılır.
 */
export function FleetVehicleScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string | string[] }>();
  const id = typeof vehicleId === 'string' ? vehicleId : '';
  const isNew = id === NEW_VEHICLE;
  const query = useFleetVehicleQuery(isNew ? '' : id);
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="fleet-vehicle-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title={isNew ? 'Araç Ekle' : 'Araç Bilgileri'} testID="fleet-vehicle-back" />
      {isNew ? (
        <VehicleForm initial={null} />
      ) : query.isPending ? (
        <StateView loading />
      ) : query.data ? (
        <VehicleForm initial={query.data} />
      ) : (
        <StateView icon="alert-circle" title="Araç bulunamadı" message={userMessage(query.error)} />
      )}
    </KeyboardAvoidingView>
  );
}

const digits = (text: string) => {
  const d = text.replace(/\D/g, '');
  return d ? Number(d) : null;
};
const grouped = (text: string) => {
  const d = digits(text);
  return d === null ? '' : formatInteger(d);
};

function VehicleForm({ initial }: { initial: FleetVehicle | null }) {
  const router = useRouter();
  const { save, remove } = useFleetMutations();
  const [plate, setPlate] = useState(initial?.plate ?? '');
  const [category, setCategory] = useState<TradeInCategory | null>(initial?.category ?? null);
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [km, setKm] = useState(initial?.km != null ? formatInteger(initial.km) : '');
  const [inspection, setInspection] = useState(formatTrDate(initial?.inspectionDue ?? null));
  const [insurance, setInsurance] = useState(formatTrDate(initial?.insuranceDue ?? null));
  const [service, setService] = useState(formatTrDate(initial?.serviceDue ?? null));
  const [renewalAge, setRenewalAge] = useState(String(initial?.renewalAgeYears ?? DEFAULT_RENEWAL_AGE_YEARS));
  const [renewalKm, setRenewalKm] = useState(formatInteger(initial?.renewalKm ?? DEFAULT_RENEWAL_KM));
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const serverErrors = save.error instanceof AppError ? save.error.fieldErrors : undefined;

  const close = () => (router.canGoBack() ? router.back() : router.replace(FLEET_HREF));

  const submit = () => {
    const next: Record<string, string> = {};
    const dates = { inspection, insurance, service };
    const parsed: Record<string, string | null> = {};
    for (const [key, text] of Object.entries(dates)) {
      parsed[key] = text.trim() ? parseTrDate(text) : null;
      if (text.trim() && !parsed[key]) next[key] = 'Tarihi GG.AA.YYYY biçiminde girin.';
    }
    const yearValue = digits(year);
    if (yearValue !== null && (yearValue < 1950 || yearValue > new Date().getFullYear() + 1)) next.year = 'Geçerli bir model yılı girin.';
    if (!plate.trim()) next.plate = 'Plakayı girin.';
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        id: initial?.id ?? null,
        input: {
          plate,
          category,
          brand: brand || null,
          model: model || null,
          year: yearValue,
          km: digits(km),
          inspectionDue: parsed.inspection,
          insuranceDue: parsed.insurance,
          serviceDue: parsed.service,
          renewalAgeYears: digits(renewalAge) ?? DEFAULT_RENEWAL_AGE_YEARS,
          renewalKm: digits(renewalKm) ?? DEFAULT_RENEWAL_KM,
          note: note || null,
        },
      },
      { onSuccess: close },
    );
  };

  const similarSearch = () => {
    const built = buildSearch({ ...EMPTY_FILTER_DRAFT, categories: category ? [category] : [] });
    if (built.ok) router.push(resultsHref(built.search));
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {initial && renewalDue(initial) ? (
        <View style={styles.renewal} testID="fleet-renewal">
          <View style={styles.renewalHead}>
            <Icon name="refresh-cw" size={18} color={Colors.heading} />
            <Text variant="bodySemibold" style={styles.flex}>
              Yenileme zamanı
            </Text>
          </View>
          <Text variant="small">Bu araç belirlediğiniz yaşı ya da kilometreyi geçti. Yeni araç ve takas seçeneklerine göz atın.</Text>
          <View style={styles.renewalButtons}>
            <Button title="Benzer araçlar" icon="search" variant="navy" style={styles.flex} onPress={similarSearch} />
            <Button title="Takasa ver" icon="repeat" variant="outline" style={styles.flex} onPress={() => router.push(tradeInHref({ kind: 'trade_in' }))} />
          </View>
        </View>
      ) : null}

      <TextField label="Plaka" value={plate} onChangeText={setPlate} autoCapitalize="characters" maxLength={15} error={errors.plate ?? serverErrors?.plate} testID="fleet-plate" />
      <View style={styles.wrap}>
        {TRADE_IN_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(category === c.id ? null : c.id)} />
        ))}
      </View>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label="Marka" value={brand} onChangeText={setBrand} maxLength={60} testID="fleet-brand" />
        </View>
        <View style={styles.flex}>
          <TextField label="Model" value={model} onChangeText={setModel} maxLength={80} testID="fleet-model" />
        </View>
      </View>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label="Model yılı" value={year} onChangeText={setYear} keyboardType="number-pad" error={errors.year} testID="fleet-year" />
        </View>
        <View style={styles.flex}>
          <TextField label="Kilometre" value={km} onChangeText={(t) => setKm(grouped(t))} keyboardType="number-pad" testID="fleet-km" />
        </View>
      </View>

      <Text variant="subheading">Hatırlatma tarihleri</Text>
      <Text variant="small">14 gün kala ve günü gelince bildirim alırsınız.</Text>
      <TextField label="Muayene" value={inspection} onChangeText={setInspection} placeholder="GG.AA.YYYY" keyboardType="numbers-and-punctuation" error={errors.inspection} testID="fleet-inspection" />
      <TextField label="Sigorta / kasko bitişi" value={insurance} onChangeText={setInsurance} placeholder="GG.AA.YYYY" keyboardType="numbers-and-punctuation" error={errors.insurance} testID="fleet-insurance" />
      <TextField label="Bakım" value={service} onChangeText={setService} placeholder="GG.AA.YYYY" keyboardType="numbers-and-punctuation" error={errors.service} testID="fleet-service" />

      <Text variant="subheading">Yenileme hatırlatması</Text>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label="Araç yaşı (yıl)" value={renewalAge} onChangeText={setRenewalAge} keyboardType="number-pad" testID="fleet-renewal-age" />
        </View>
        <View style={styles.flex}>
          <TextField label="Kilometre" value={renewalKm} onChangeText={(t) => setRenewalKm(grouped(t))} keyboardType="number-pad" testID="fleet-renewal-km" />
        </View>
      </View>
      <TextField label="Not (isteğe bağlı)" value={note} onChangeText={setNote} multiline maxLength={500} style={styles.multiline} testID="fleet-note" />

      {save.isError && !serverErrors ? (
        <Text variant="small" color="danger">
          {userMessage(save.error)}
        </Text>
      ) : null}
      <Button title="Kaydet" loading={save.isPending} onPress={submit} testID="fleet-save" />
      {initial ? (
        <Button
          title="Aracı Sil"
          icon="trash-2"
          variant="outline"
          loading={remove.isPending}
          onPress={() =>
            Alert.alert('Araç silinsin mi?', `${initial.plate} filonuzdan kaldırılacak.`, [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(initial.id, { onSuccess: close }) },
            ])
          }
          testID="fleet-delete"
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: Spacing.three },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  multiline: { minHeight: 80, paddingVertical: Spacing.two, textAlignVertical: 'top' },
  renewal: { backgroundColor: Colors.surfaceHighlight, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  renewalHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  renewalButtons: { flexDirection: 'row', gap: Spacing.two },
});
