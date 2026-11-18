import { StyleSheet, View } from 'react-native';

import { FINANCE_DECLINED, FINANCE_STAGES, SALES_STAGES, userMessage, type Lead } from '@/domain';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Card, Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useUpdateLead } from './useLeadsQueries';

/**
 * Madde 22: finansman başvuru takibi. Müşteri adımları salt okunur görür (tamamlananlar yeşil tik, güncel adım vurgulu, olumsuz sonuç kırmızı).
 * Yönetici adıma dokunarak günceller; her değişiklikte müşteriye bildirim gider.
 */
export function FinanceStageCard({ lead, isAdmin }: { lead: Lead; isAdmin: boolean }) {
  const update = useUpdateLead(lead.id);
  const current = lead.financeStage;
  const declined = current === 'declined';
  const index = FINANCE_STAGES.findIndex((s) => s.id === current);
  if (!isAdmin && !current) return null;
  return (
    <Card style={styles.card}>
      <Text variant="subheading">Finansman başvurusu</Text>
      {FINANCE_STAGES.map((stage, i) => {
        const done = !declined && index >= 0 && i < index;
        const active = !declined && i === index;
        return (
          <View key={stage.id} style={styles.step} testID={`finance-stage-${stage.id}`}>
            <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
              {done ? <Icon name="check" size={14} color="white" /> : <Text variant="caption" style={active ? styles.white : undefined}>{i + 1}</Text>}
            </View>
            <Text variant={active ? 'bodySemibold' : 'body'} color={done || active ? 'text' : 'textTertiary'} style={styles.flex}>
              {stage.label}
            </Text>
          </View>
        );
      })}
      {declined ? (
        <View style={styles.declined}>
          <Icon name="x-circle" size={18} color="danger" />
          <Text variant="smallSemibold" color="danger">
            {FINANCE_DECLINED.label}
          </Text>
        </View>
      ) : null}
      {isAdmin ? (
        <View style={styles.admin}>
          <Text variant="caption">Adımı güncelleyin (müşteriye bildirim gider):</Text>
          <View style={styles.wrap}>
            {[...FINANCE_STAGES, FINANCE_DECLINED].map((stage) => (
              <Chip key={stage.id} label={stage.label} selected={current === stage.id} onPress={() => current !== stage.id && update.mutate({ financeStage: stage.id })} />
            ))}
          </View>
          {update.isError ? (
            <Text variant="small" color="danger">
              {userMessage(update.error)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Madde 34 (yönetici): satış süreci adımı — firma içi takip; müşteriye gösterilmez. */
export function SalesStageCard({ lead }: { lead: Lead }) {
  const update = useUpdateLead(lead.id);
  return (
    <Card style={styles.card}>
      <Text variant="subheading">Satış süreci (firma içi)</Text>
      <View style={styles.wrap}>
        {SALES_STAGES.map((stage) => (
          <Chip
            key={stage.id}
            label={stage.label}
            selected={lead.salesStage === stage.id}
            onPress={() => update.mutate({ salesStage: lead.salesStage === stage.id ? null : stage.id })}
          />
        ))}
      </View>
      <Text variant="caption">Müşteri bu adımları görmez. Tüm süreç: Profil → Satış Süreci.</Text>
      {update.isError ? (
        <Text variant="small" color="danger">
          {userMessage(update.error)}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, gap: Spacing.two },
  flex: { flex: 1 },
  white: { color: Colors.white },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 2 },
  dot: { width: 26, height: 26, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: Colors.green, borderColor: Colors.green },
  dotActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  declined: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  admin: { gap: Spacing.two, marginTop: Spacing.one },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
