import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { LEAD_TOPIC_SHORT, toLocalDateKey, userMessage, type Lead } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Badge, Card, IconTile } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { LEAD_STATUS_TONES, LEAD_TOPIC_ICONS, dayLabel, leadStatusLabel } from './presentation';
import { leadHref } from './routes';
import { useAppointmentsQuery } from './useLeadsQueries';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Yönetici: randevular (madde 31). İnceleme, görüntülü görüşme, ekspertiz ve diğer randevulu talepler tek listede, güne göre gruplu (Bugün,
 * Yarın, Cum 21 Kas…). Satır: saat, müşteri, konu, ilan, durum; dokununca talep detayı (randevu değiştirme) açılır.
 */
export function AppointmentsScreen() {
  const router = useRouter();
  const query = useAppointmentsQuery();
  const { refetch } = query;
  const { pulling, onRefresh } = usePullRefresh(refetch);

  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  const sections = groupByDay(query.data ?? []);

  let empty = null;
  if (query.isPending) {
    empty = (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  } else if (query.isError && !query.data) {
    empty = <StateMessage icon="wifi-off" title="Randevular yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="appointments-error" />;
  } else {
    empty = <StateMessage top icon="calendar" title="Yaklaşan randevu yok" message="Talep detayından randevu oluşturduğunuzda burada listelenir." testID="appointments-empty" />;
  }

  return (
    <View style={styles.container} testID="appointments-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Randevular" testID="appointments-back" right={<AdminBadge />} />
      <SectionList
        style={styles.flex}
        contentContainerStyle={styles.list}
        sections={sections}
        keyExtractor={(lead) => lead.id}
        renderSectionHeader={({ section }) => (
          <Text variant="overline" style={styles.sectionHeader}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => <AppointmentRow lead={item} onPress={() => router.push(leadHref(item.id))} />}
        ListEmptyComponent={empty}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="appointments-list"
      />
    </View>
  );
}

function groupByDay(leads: readonly Lead[]) {
  const groups = new Map<string, Lead[]>();
  for (const lead of leads) {
    if (!lead.appointmentAt) continue;
    const key = toLocalDateKey(new Date(lead.appointmentAt));
    groups.set(key, [...(groups.get(key) ?? []), lead]);
  }
  return Array.from(groups.entries()).map(([key, data]) => ({ key, title: dayLabel(key), data }));
}

function AppointmentRow({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const at = new Date(lead.appointmentAt ?? '');
  return (
    <Card style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]} testID={`appointment-row-${lead.id}`}>
        <View style={styles.time}>
          <Text variant="subheading">{`${pad(at.getHours())}:${pad(at.getMinutes())}`}</Text>
        </View>
        <IconTile icon={LEAD_TOPIC_ICONS[lead.topic]} size={40} />
        <View style={styles.text}>
          <Text variant="bodySemibold" numberOfLines={1}>
            {lead.customer.fullName}
          </Text>
          <Text variant="small" numberOfLines={1}>
            {LEAD_TOPIC_SHORT[lead.topic]}
            {lead.listing ? ` · ${lead.listing.title}` : ''}
          </Text>
          {lead.advisor ? <Text variant="caption">Danışman: {lead.advisor.fullName}</Text> : null}
        </View>
        <View style={styles.side}>
          <Badge label={leadStatusLabel(lead.status)} tone={LEAD_STATUS_TONES[lead.status]} />
          <Icon name="chevron-right" size={20} color="textTertiary" />
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  list: { flexGrow: 1, padding: Spacing.three },
  sectionHeader: { marginTop: Spacing.three, marginBottom: Spacing.two },
  card: { marginBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  pressed: { backgroundColor: Colors.background },
  time: { minWidth: 52 },
  text: { flex: 1, gap: 2 },
  side: { alignItems: 'flex-end', gap: Spacing.one },
});
