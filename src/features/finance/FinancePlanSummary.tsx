import { StyleSheet, View } from 'react-native';

import { formatMoney, formatRatePercent, type FinancePlan } from '@/domain';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

const tl = (kurus: number) => formatMoney({ amountKurus: kurus, currency: 'TRY' });

/** Ödeme planı özeti: büyük aylık taksit + kredi, peşinat, vade ve toplam satırları. Hesaplayıcı, talep formu ve talep detayında aynıdır. */
export function FinancePlanSummary({ plan, testID }: { plan: FinancePlan; testID?: string }) {
  return (
    <View style={styles.box} testID={testID}>
      <Text variant="small">Tahmini aylık taksit</Text>
      <Text variant="priceLarge" style={styles.monthly} testID={testID ? `${testID}-monthly` : undefined}>
        {tl(plan.monthlyPaymentKurus)}
      </Text>
      <Row label="Peşinat" value={tl(plan.downPaymentKurus)} />
      <Row label="Kredi tutarı" value={tl(plan.creditKurus)} />
      <Row label="Vade" value={`${plan.termMonths} ay · aylık ${formatRatePercent(plan.monthlyRatePercent)}`} />
      <Row label="Toplam ödeme" value={tl(plan.totalPaymentKurus)} strong />
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="small" style={styles.flex}>
        {label}
      </Text>
      <Text variant={strong ? 'smallSemibold' : 'smallMedium'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: Colors.successSoft, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  monthly: { color: Colors.success, marginBottom: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
