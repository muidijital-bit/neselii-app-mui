import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { LEAD_TOPIC_SHORT, SALES_STAGES, formatMoney, userMessage, type Lead } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { formatLeadDate } from './presentation';
import { leadHref } from './routes';
import { useSalesPipelineQuery } from './useLeadsQueries';

/** Madde 34 (yönetici): satış süreci — satış adımı atanmış talepler adıma göre gruplu (Görüşme → Teslimat, Tamamlandı, Kaybedildi). */
export function SalesPipelineScreen() {
  const router = useRouter();
  const query = useSalesPipelineQuery();
  const { refetch } = query;
  const { pulling, onRefresh } = usePullRefresh(refetch);
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );
  const leads = query.data ?? [];
  const sections = SALES_STAGES.map((stage) => ({ key: stage.id, title: stage.label, data: leads.filter((l) => l.salesStage === stage.id) })).filter((s) => s.data.length);

  let empty = null;
  if (query.isPending) {
    empty = (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  } else if (query.isError && !query.data) {
    empty = <StateMessage icon="wifi-off" title="Yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="pipeline-error" />;
  } else {
    empty = <StateMessage top icon="trending-up" title="Süreçte talep yok" message="Talep detayındaki “Satış süreci” kartından adım atadığınız talepler burada gruplanır." testID="pipeline-empty" />;
  }

  return (
    <View style={styles.container} testID="sales-pipeline-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Satış Süreci" testID="pipeline-back" right={<AdminBadge />} />
      <SectionList
        style={styles.flex}
        contentContainerStyle={styles.list}
        sections={sections}
        keyExtractor={(l) => l.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text variant="overline" style={styles.header}>
            {section.title} ({section.data.length})
          </Text>
        )}
        renderItem={({ item }) => <PipelineRow lead={item} onPress={() => router.push(leadHref(item.id))} />}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
      />
    </View>
  );
}

function PipelineRow({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  return (
    <Card style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.flex}>
          <Text variant="bodySemibold" numberOfLines={1}>
            {lead.customer.fullName} · {LEAD_TOPIC_SHORT[lead.topic]}
          </Text>
          <Text variant="small" numberOfLines={1}>
            {lead.listing ? `${lead.listing.title} · ${formatMoney(lead.listing.price)}` : 'Genel talep'}
          </Text>
          <Text variant="caption">
            {lead.advisor ? `${lead.advisor.fullName} · ` : ''}
            {formatLeadDate(lead.updatedAt)}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color="textTertiary" />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  list: { flexGrow: 1, padding: Spacing.three },
  header: { marginTop: Spacing.three, marginBottom: Spacing.two },
  card: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  pressed: { backgroundColor: Colors.background },
});
