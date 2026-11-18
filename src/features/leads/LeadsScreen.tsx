import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { LEAD_STATUSES, LEAD_TOPIC_SHORT, TRADE_LEAD_TOPICS, userMessage, type Lead, type LeadStatus } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Badge, Card, Chip, IconTile } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { LEAD_STATUS_TONES, LEAD_TOPIC_ICONS, formatAppointment, formatLeadDate, leadStatusLabel, leadWhen } from './presentation';
import { leadHref } from './routes';
import { useLeadsQuery } from './useLeadsQueries';

/**
 * Talepler. Müşteri: "Taleplerim" (kendi talepleri, durum ve atanan danışmanla). Yönetici: firmaya gelen tüm talepler, durum süzgeciyle; satırda
 * müşteri adı görünür. Satıra dokununca talep detayı açılır. Her odakta liste servisle eşitlenir.
 */
export function LeadsScreen() {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  // Madde 40: `group=trade` → yalnız takas ve araç alım talepleri (ayrı liste).
  const { group } = useLocalSearchParams<{ group?: string }>();
  const trade = group === 'trade';
  const [status, setStatus] = useState<LeadStatus | null>(isAdmin ? 'new' : null);
  const query = useLeadsQuery(isAdmin ? status : null, trade ? TRADE_LEAD_TOPICS : undefined);
  const { refetch } = query;
  const { pulling, onRefresh } = usePullRefresh(refetch);

  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  const leads = query.data?.pages.flatMap((page) => page.items) ?? [];

  let empty = null;
  if (query.isPending) {
    empty = (
      <View style={styles.loading} accessible accessibilityLabel="Talepler yükleniyor" testID="leads-loading">
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  } else if (query.isError && !query.data) {
    empty = <StateMessage icon="wifi-off" title="Talepler yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="leads-error" />;
  } else if (isAdmin) {
    empty = <StateMessage top icon="inbox" title="Talep yok" message={status ? 'Bu durumda talep bulunmuyor.' : 'Henüz talep gelmedi.'} testID="leads-empty" />;
  } else {
    empty = (
      <StateMessage
        top
        icon="phone-call"
        title="Henüz talebiniz yok"
        message="İlan detayındaki “Beni Arayın” ile danışmanımızdan geri arama isteyebilirsiniz."
        actionLabel="İlanlara göz at"
        actionIcon="search"
        onAction={() => router.navigate('/')}
        testID="leads-empty"
      />
    );
  }

  return (
    <View style={styles.container} testID="leads-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title={trade ? 'Takas ve Alım' : isAdmin ? 'Talepler' : 'Taleplerim'} testID="leads-back" right={<AdminBadge />}>
        {isAdmin ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} testID="leads-filters">
            <Chip label="Tümü" selected={status === null} onPress={() => setStatus(null)} />
            {LEAD_STATUSES.map((value) => (
              <Chip key={value} label={leadStatusLabel(value)} selected={status === value} onPress={() => setStatus(value)} />
            ))}
          </ScrollView>
        ) : null}
      </PageHeader>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={leads}
        keyExtractor={(lead) => lead.id}
        renderItem={({ item }) => <LeadRow lead={item} isAdmin={isAdmin} onPress={() => router.push(leadHref(item.id))} />}
        ListEmptyComponent={empty}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={Colors.navy} style={styles.footer} /> : null}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="leads-list"
      />
    </View>
  );
}

function LeadRow({ lead, isAdmin, onPress }: { lead: Lead; isAdmin: boolean; onPress: () => void }) {
  const title = isAdmin ? lead.customer.fullName : LEAD_TOPIC_SHORT[lead.topic];
  const subtitle = isAdmin ? `${LEAD_TOPIC_SHORT[lead.topic]} · ${lead.listing?.title ?? 'Genel talep'}` : (lead.listing?.title ?? 'Genel talep');
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${leadStatusLabel(lead.status)}`}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        testID={`lead-row-${lead.id}`}>
        <IconTile icon={LEAD_TOPIC_ICONS[lead.topic]} size={44} />
        <View style={styles.rowText}>
          <View style={styles.rowHead}>
            <Text variant="bodySemibold" numberOfLines={1} style={styles.flex}>
              {title}
            </Text>
            {lead.approvalStatus === 'pending' ? (
              <Badge label="Onay bekliyor" tone="warning" />
            ) : (
              <Badge label={leadStatusLabel(lead.status)} tone={LEAD_STATUS_TONES[lead.status]} />
            )}
          </View>
          <Text variant="small" numberOfLines={1}>
            {subtitle}
          </Text>
          <View style={styles.meta}>
            <Icon name={lead.appointmentAt ? 'calendar' : 'clock'} size={14} color={lead.appointmentAt ? 'success' : 'textTertiary'} />
            <Text variant="caption" numberOfLines={1} style={styles.flex}>
              {lead.appointmentAt ? `Randevu: ${formatAppointment(lead.appointmentAt)}` : leadWhen(lead)}
              {lead.advisor ? ` · ${lead.advisor.fullName}` : ''}
            </Text>
          </View>
          <Text variant="caption" color="textTertiary">
            {formatLeadDate(lead.createdAt)}
          </Text>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  list: { flexGrow: 1, padding: Spacing.three, gap: Spacing.three },
  filters: { gap: Spacing.two, paddingRight: Spacing.three },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  footer: { marginVertical: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three },
  pressed: { backgroundColor: Colors.background },
  rowText: { flex: 1, gap: 2 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: 2 },
});
