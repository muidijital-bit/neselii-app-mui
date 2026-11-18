import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { computePlan, downPaymentOptions, formatRatePercent, type Money } from '@/domain';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Chip } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { FinancePlanSummary } from './FinancePlanSummary';
import { financeLeadHref } from './routes';
import { useFinanceSettings } from './useFinance';

/**
 * İlan detayındaki "Aylık ödeme hesapla" bölümü: peşinat oranı ve vade seçilir, firmanın faiz oranıyla aylık taksit ve toplam ödeme hesaplanır.
 * Müşteride "Bu plan için beni arayın" planı finansman talebine ekler. Ayarlar yüklenemezse bölüm çizilmez (ilan detayı bozulmaz).
 */
export function FinanceCalculatorCard({ listingId, price, showLeadAction }: { listingId: string; price: Money; showLeadAction: boolean }) {
  const router = useRouter();
  const settings = useFinanceSettings();
  const [downPercent, setDownPercent] = useState<number | null>(null);
  const [term, setTerm] = useState<number | null>(null);

  if (!settings.data || price.amountKurus <= 0) return null;
  const options = downPaymentOptions(settings.data);
  const terms = settings.data.terms;
  const selectedDown = downPercent !== null && options.includes(downPercent) ? downPercent : options[0] ?? 0;
  const selectedTerm = term !== null && terms.includes(term) ? term : terms[terms.length - 1] ?? 12;
  const plan = computePlan(price.amountKurus, Math.round((price.amountKurus * selectedDown) / 100), selectedTerm, settings.data.monthlyRatePercent);

  return (
    <View style={styles.section} testID="listing-finance-calculator">
      <Text variant="heading" accessibilityRole="header">
        Aylık ödeme hesapla
      </Text>
      <Text variant="small">Peşinat ve vadeyi seçin; aylık {formatRatePercent(settings.data.monthlyRatePercent)} faizle tahmini taksit hesaplanır.</Text>

      <Text variant="smallMedium" color="textSecondary" style={styles.label}>
        Peşinat
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((percent) => (
          <Chip key={percent} label={`%${percent}`} selected={percent === selectedDown} onPress={() => setDownPercent(percent)} />
        ))}
      </ScrollView>

      <Text variant="smallMedium" color="textSecondary" style={styles.label}>
        Vade
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {terms.map((months) => (
          <Chip key={months} label={`${months} ay`} selected={months === selectedTerm} onPress={() => setTerm(months)} />
        ))}
      </ScrollView>

      <View style={styles.result}>
        <FinancePlanSummary plan={plan} testID="listing-finance-plan" />
      </View>
      <Text variant="caption">Hesaplama bilgi amaçlıdır; kesin oran ve koşulları danışmanımız iletir.</Text>
      {showLeadAction ? (
        <Button
          title="Bu plan için beni arayın"
          icon="phone-incoming"
          variant="navy"
          onPress={() => router.push(financeLeadHref(listingId, plan))}
          testID="listing-finance-lead"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: Colors.surface, padding: Spacing.three, gap: Spacing.two, marginBottom: Spacing.two },
  label: { marginTop: Spacing.two },
  chips: { gap: Spacing.two, paddingRight: Spacing.three },
  result: { marginTop: Spacing.two },
});
