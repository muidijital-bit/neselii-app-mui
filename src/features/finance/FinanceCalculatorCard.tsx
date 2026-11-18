import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { compareBanks, computePlan, downPaymentOptions, formatMoney, formatRatePercent, type Money } from '@/domain';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { FinancePlanSummary } from './FinancePlanSummary';
import { financeLeadHref, ownershipCostHref, profitHref } from './routes';
import { useBanks, useFinanceSettings } from './useFinance';

/**
 * İlan detayındaki "Aylık ödeme hesapla" bölümü: peşinat oranı ve vade seçilir, firmanın faiz oranıyla aylık taksit ve toplam ödeme hesaplanır.
 * Müşteride "Bu plan için beni arayın" planı finansman talebine ekler. Ayarlar yüklenemezse bölüm çizilmez (ilan detayı bozulmaz).
 */
export function FinanceCalculatorCard({ listingId, price, showLeadAction }: { listingId: string; price: Money; showLeadAction: boolean }) {
  const router = useRouter();
  const settings = useFinanceSettings();
  const banks = useBanks();
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
      {/* Madde 20: aynı peşinat ve vadeyle anlaşmalı bankaların karşılaştırması. */}
      {banks.data && banks.data.length > 0 ? (
        <View style={styles.banks} testID="listing-bank-comparison">
          <Text variant="smallSemibold">Anlaşmalı bankalar · {selectedTerm} ay, %{selectedDown} peşinat</Text>
          {compareBanks(price.amountKurus, plan.downPaymentKurus, selectedTerm, banks.data).map(({ bank, plan: bankPlan, cheapest }) => (
            <View key={bank.id} style={[styles.bankRow, cheapest && styles.bankCheapest]}>
              <View style={styles.flex}>
                <Text variant="bodySemibold">{bank.name}</Text>
                <Text variant="caption">
                  Aylık {formatRatePercent(bank.monthlyRatePercent)} · toplam {formatMoney({ amountKurus: bankPlan.totalPaymentKurus, currency: 'TRY' })}
                </Text>
              </View>
              <View style={styles.bankRight}>
                <Text variant="bodySemibold" color={cheapest ? 'success' : 'text'}>
                  {formatMoney({ amountKurus: bankPlan.monthlyPaymentKurus, currency: 'TRY' })}
                </Text>
                {cheapest ? (
                  <Text variant="caption" color="success">
                    En uygun
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <Text variant="caption">Hesaplama bilgi amaçlıdır; kesin oran ve koşulları danışmanımız iletir.</Text>
      {/* Madde 24: yakıt, bakım, lastik, sigorta, vergi ve taksitle toplam maliyet. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(ownershipCostHref(listingId))}
        style={({ pressed }) => [styles.costLink, pressed && styles.pressed]}
        testID="listing-ownership-cost">
        <Icon name="mci:gas-station-outline" size={20} color="heading" />
        <Text variant="bodySemibold" color="heading" style={styles.flex}>
          Toplam sahip olma maliyetini hesapla
        </Text>
        <Icon name="chevron-right" size={20} color="textTertiary" />
      </Pressable>
      {/* Madde 25: sefer geliriyle aylık net kazanç ve başa baş süresi. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(profitHref(listingId))}
        style={({ pressed }) => [styles.costLink, styles.costLinkNext, pressed && styles.pressed]}
        testID="listing-profit">
        <Icon name="trending-up" size={20} color="heading" />
        <Text variant="bodySemibold" color="heading" style={styles.flex}>
          Kârlılık ve amortisman hesapla
        </Text>
        <Icon name="chevron-right" size={20} color="textTertiary" />
      </Pressable>
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
  flex: { flex: 1 },
  costLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  costLinkNext: { borderTopWidth: 0, marginTop: -Spacing.two },
  pressed: { opacity: 0.7 },
  banks: { gap: Spacing.two, marginTop: Spacing.two },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  bankCheapest: { borderColor: Colors.green, backgroundColor: Colors.successSoft },
  bankRight: { alignItems: 'flex-end' },
});
