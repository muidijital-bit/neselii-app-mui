import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { AVAILABLE_TERMS, AppError, CATEGORY_CATALOG, computePlan, userMessage, type CategoryId, type FinanceSettings } from '@/domain';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { BankRatesEditor } from './BankRatesEditor';
import { FinancePlanSummary } from './FinancePlanSummary';
import { useFinanceSettings, useUpdateFinanceSettings } from './useFinance';

/** Örnek hesap: 1.000.000 TL araç (ayar değişince önizleme anında güncellenir). */
const SAMPLE_PRICE_KURUS = 100_000_000;

/**
 * Yönetici: finansman ayarları. Aylık faiz, en düşük peşinat oranı ve sunulan vadeler; ilan detayındaki hesaplayıcı ve "Bütçeme göre bul"
 * bu değerleri kullanır. Altta 1.000.000 TL'lik örnek bir aracın planı canlı gösterilir.
 */
export function FinanceSettingsScreen() {
  const settings = useFinanceSettings();
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="finance-settings-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Finansman Ayarları" testID="finance-settings-back" right={<AdminBadge />} />
      {settings.isPending ? (
        <StateView loading />
      ) : settings.data ? (
        <SettingsForm initial={settings.data} />
      ) : (
        <StateView title="Ayarlar yüklenemedi" message={userMessage(settings.error)} actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void settings.refetch() }]} />
      )}
    </KeyboardAvoidingView>
  );
}

const parseDecimal = (text: string) => Number(text.replace(',', '.').replace(/[^\d.]/g, ''));
const toText = (value: number) => String(value).replace('.', ',');

/** Tüketimi girilen kategoriler (madde 24). */
const CONSUMPTION_CATEGORIES: readonly CategoryId[] = ['kamyon', 'cekici', 'ticari-arac'];

function SettingsForm({ initial }: { initial: FinanceSettings }) {
  const update = useUpdateFinanceSettings();
  const [rate, setRate] = useState(String(initial.monthlyRatePercent).replace('.', ','));
  const [minDown, setMinDown] = useState(String(initial.minDownPaymentPercent));
  const [terms, setTerms] = useState<readonly number[]>(initial.terms);
  const [fuelPrice, setFuelPrice] = useState(toText(initial.costs.fuelPriceTl));
  const [consumption, setConsumption] = useState<Record<string, string>>(() =>
    Object.fromEntries(CONSUMPTION_CATEGORIES.map((id) => [id, toText(initial.costs.fuelConsumption[id] ?? 0)])),
  );
  const [maintenance, setMaintenance] = useState(toText(initial.costs.maintenanceTlPerKm));
  const [tire, setTire] = useState(toText(initial.costs.tireTlPerKm));
  const [insurance, setInsurance] = useState(String(initial.costs.insuranceTlPerYear));
  const [tax, setTax] = useState(String(initial.costs.taxTlPerYear));
  const [saved, setSaved] = useState(false);

  const draft: FinanceSettings = {
    monthlyRatePercent: parseDecimal(rate),
    minDownPaymentPercent: Number(minDown.replace(/\D/g, '')),
    terms,
    costs: {
      fuelPriceTl: parseDecimal(fuelPrice),
      fuelConsumption: { ...initial.costs.fuelConsumption, ...Object.fromEntries(Object.entries(consumption).map(([id, text]) => [id, parseDecimal(text)])) },
      maintenanceTlPerKm: parseDecimal(maintenance),
      tireTlPerKm: parseDecimal(tire),
      insuranceTlPerYear: Number(insurance.replace(/\D/g, '')),
      taxTlPerYear: Number(tax.replace(/\D/g, '')),
    },
  };
  const costTexts = [fuelPrice, maintenance, tire, insurance, tax, ...Object.values(consumption)];
  const valid =
    Number.isFinite(draft.monthlyRatePercent) && rate.trim() !== '' && minDown.trim() !== '' && terms.length > 0 && costTexts.every((t) => t.trim() !== '');
  const fieldErrors = update.error instanceof AppError ? update.error.fieldErrors : undefined;
  const longest = terms.length ? Math.max(...terms) : 12;
  const preview = valid ? computePlan(SAMPLE_PRICE_KURUS, Math.round((SAMPLE_PRICE_KURUS * draft.minDownPaymentPercent) / 100), longest, draft.monthlyRatePercent) : null;

  const change = <T,>(setter: (value: T) => void) => (value: T) => {
    setSaved(false);
    update.reset();
    setter(value);
  };
  const toggleTerm = (term: number) =>
    change(setTerms)(terms.includes(term) ? terms.filter((t) => t !== term) : [...terms, term].sort((a, b) => a - b));

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField
        label="Aylık faiz oranı (%)"
        value={rate}
        onChangeText={change(setRate)}
        keyboardType="decimal-pad"
        placeholder="Ör. 2,99"
        helper="Vergiler dahil aylık oran. Hesaplayıcıda müşteriye bu oran gösterilir."
        error={fieldErrors?.monthlyRatePercent}
        testID="finance-rate"
      />
      <TextField
        label="En düşük peşinat oranı (%)"
        value={minDown}
        onChangeText={change(setMinDown)}
        keyboardType="number-pad"
        placeholder="Ör. 30"
        error={fieldErrors?.minDownPaymentPercent}
        testID="finance-min-down"
      />
      <View style={styles.group}>
        <Text variant="smallMedium" color="textSecondary">
          Sunulan vadeler
        </Text>
        <View style={styles.wrap}>
          {AVAILABLE_TERMS.map((term) => (
            <Chip key={term} label={`${term} ay`} selected={terms.includes(term)} onPress={() => toggleTerm(term)} />
          ))}
        </View>
        {fieldErrors?.terms || terms.length === 0 ? (
          <Text variant="caption" color="danger">
            {fieldErrors?.terms ?? 'En az bir vade seçin.'}
          </Text>
        ) : null}
      </View>

      <View style={styles.group}>
        <Text variant="subheading">Maliyet varsayılanları</Text>
        <Text variant="small">İlan detayındaki “Toplam sahip olma maliyeti” hesabında kullanılır; müşteri yıllık km ve tüketimi değiştirebilir.</Text>
        <TextField label="Motorin fiyatı (TL / litre)" value={fuelPrice} onChangeText={change(setFuelPrice)} keyboardType="decimal-pad" error={fieldErrors?.fuelPriceTl} testID="finance-fuel-price" />
        <Text variant="smallMedium" color="textSecondary">
          Ortalama tüketim (litre / 100 km)
        </Text>
        <View style={styles.pair}>
          {CONSUMPTION_CATEGORIES.map((id) => (
            <View key={id} style={styles.flex}>
              <TextField
                label={CATEGORY_CATALOG[id].name}
                value={consumption[id] ?? ''}
                onChangeText={change((text: string) => setConsumption((current) => ({ ...current, [id]: text })))}
                keyboardType="decimal-pad"
                testID={`finance-consumption-${id}`}
              />
            </View>
          ))}
        </View>
        {fieldErrors?.fuelConsumption ? (
          <Text variant="caption" color="danger">
            {fieldErrors.fuelConsumption}
          </Text>
        ) : null}
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField label="Bakım (TL / km)" value={maintenance} onChangeText={change(setMaintenance)} keyboardType="decimal-pad" error={fieldErrors?.maintenanceTlPerKm} testID="finance-maintenance" />
          </View>
          <View style={styles.flex}>
            <TextField label="Lastik (TL / km)" value={tire} onChangeText={change(setTire)} keyboardType="decimal-pad" error={fieldErrors?.tireTlPerKm} testID="finance-tire" />
          </View>
        </View>
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField label="Sigorta (TL / yıl)" value={insurance} onChangeText={change(setInsurance)} keyboardType="number-pad" error={fieldErrors?.insuranceTlPerYear} testID="finance-insurance" />
          </View>
          <View style={styles.flex}>
            <TextField label="Vergi (TL / yıl)" value={tax} onChangeText={change(setTax)} keyboardType="number-pad" error={fieldErrors?.taxTlPerYear} testID="finance-tax" />
          </View>
        </View>
      </View>

      {/* Madde 20: anlaşmalı bankalar (ayrı kaydedilir). */}
      <BankRatesEditor />

      {preview ? (
        <View style={styles.group}>
          <Text variant="smallMedium" color="textSecondary">
            Örnek: 1.000.000 TL araç, %{draft.minDownPaymentPercent} peşinat
          </Text>
          <FinancePlanSummary plan={preview} testID="finance-preview" />
        </View>
      ) : null}

      {saved ? (
        <View style={styles.success} accessibilityRole="alert" testID="finance-saved">
          <Icon name="check-circle" size={20} color="success" />
          <Text variant="small" color="success" style={styles.flex}>
            Ayarlar kaydedildi. Hesaplayıcılar yeni değerleri kullanıyor.
          </Text>
        </View>
      ) : null}
      {update.isError && !fieldErrors ? (
        <Text variant="small" color="danger" accessibilityRole="alert">
          {userMessage(update.error)}
        </Text>
      ) : null}
      <Button
        title="Kaydet"
        disabled={!valid}
        loading={update.isPending}
        onPress={() => update.mutate(draft, { onSuccess: () => setSaved(true) })}
        testID="finance-save"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  group: { gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.two },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three - Spacing.one,
    borderRadius: Radius.md,
    backgroundColor: Colors.successSoft,
  },
});
