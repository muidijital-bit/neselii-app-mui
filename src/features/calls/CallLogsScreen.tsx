import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { userMessage, type CallLog } from '@/domain';
import { formatLeadDate, telUrl } from '@/features/leads/presentation';
import { StateMessage } from '@/features/listings/ListStates';
import { listingHref } from '@/features/listings/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { useCallLogsQuery, useCallSummaryQuery } from './useCallLogs';

/**
 * Yönetici: arama kayıtları (madde 27). Üstte bugün / son 7 gün / toplam; altta en yeni önce kim hangi ilan için aradı. Müşterinin telefonu
 * profilinde varsa geri arama düğmesi görünür; ilana dokununca ilan açılır.
 */
export function CallLogsScreen() {
  const router = useRouter();
  const query = useCallLogsQuery();
  const summary = useCallSummaryQuery();
  const refresh = useCallback(() => Promise.all([query.refetch(), summary.refetch()]), [query, summary]);
  const { pulling, onRefresh } = usePullRefresh(refresh);
  const { refetch } = query;
  const { refetch: refetchSummary } = summary;

  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
      void refetchSummary({ cancelRefetch: false });
    }, [refetch, refetchSummary]),
  );

  const logs = query.data?.pages.flatMap((page) => page.items) ?? [];
  let empty = null;
  if (query.isPending) {
    empty = (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  } else if (query.isError && !query.data) {
    empty = <StateMessage icon="wifi-off" title="Kayıtlar yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="call-logs-error" />;
  } else {
    empty = <StateMessage top icon="phone" title="Henüz arama yok" message="Müşteriler “Hemen Ara”ya dokundukça burada listelenir." testID="call-logs-empty" />;
  }

  return (
    <View style={styles.container} testID="call-logs-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Arama Kayıtları" testID="call-logs-back" right={<AdminBadge />}>
        <View style={styles.stats}>
          <Stat label="Bugün" value={summary.data?.today} />
          <Stat label="Son 7 gün" value={summary.data?.last7Days} />
          <Stat label="Toplam" value={summary.data?.total} />
        </View>
      </PageHeader>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={logs}
        keyExtractor={(log) => log.id}
        renderItem={({ item }) => <CallRow log={item} onOpenListing={(id) => router.push(listingHref(id))} />}
        ListEmptyComponent={empty}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="call-logs-list"
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <View style={styles.stat}>
      <Text variant="heading">{value ?? '—'}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

function CallRow({ log, onOpenListing }: { log: CallLog; onOpenListing: (id: string) => void }) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon name="phone-outgoing" size={20} color="heading" />
        </View>
        <View style={styles.text}>
          <Text variant="bodySemibold" numberOfLines={1}>
            {log.customer.fullName}
          </Text>
          {log.listing ? (
            <Pressable accessibilityRole="link" onPress={() => onOpenListing(log.listing!.id)}>
              <Text variant="small" color="heading" numberOfLines={1}>
                {log.listing.title}
              </Text>
            </Pressable>
          ) : (
            <Text variant="small">Genel arama (ana sayfa)</Text>
          )}
          <Text variant="caption">{formatLeadDate(log.createdAt)}</Text>
        </View>
        {log.customer.phone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${log.customer.fullName} kişisini ara`}
            onPress={() => void Linking.openURL(telUrl(log.customer.phone!)).catch(() => undefined)}
            style={styles.callBack}
            testID={`call-log-callback-${log.id}`}>
            <Icon name="phone" size={18} color="white" />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingVertical: Spacing.two, alignItems: 'center' },
  list: { flexGrow: 1, padding: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  icon: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  callBack: { width: 40, height: 40, borderRadius: Radius.pill, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
});
