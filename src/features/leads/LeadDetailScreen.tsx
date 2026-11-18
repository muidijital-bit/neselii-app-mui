import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppError, LEAD_STATUSES, LEAD_TOPIC_LABELS, asAdvisorId, formatMoney, toLocalDateKey, upcomingDays, userMessage, type Lead } from '@/domain';
import { useAdvisorsQuery } from '@/features/advisors/useAdvisors';
import { FinancePlanSummary } from '@/features/finance/FinancePlanSummary';
import { listingHref } from '@/features/listings/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon, type IconName } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { OptionSheet } from '@/ui/OptionSheet';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { Badge, Card, Chip, Divider } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { APPOINTMENT_TIMES, LEAD_STATUS_TONES, appointmentIso, dayLabel, formatAppointment, formatLeadDate, leadStatusLabel, leadWhen, telUrl } from './presentation';
import { useLeadQuery, useUpdateLead } from './useLeadsQueries';

/**
 * Talep detayı. Müşteri: konu, durum, arama zamanı ve atanan danışman ("Danışmanınız … sizi arayacaktır"). Yönetici: ayrıca müşteri adı ve telefonu
 * ("Müşteriyi Ara"), durum değiştirme ve danışman değiştirme; her değişiklikte müşteriye bildirim gider (sunucu tetikleyicisi).
 */
export function LeadDetailScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string | string[] }>();
  const id = typeof leadId === 'string' ? leadId.trim() : '';
  const query = useLeadQuery(id);

  let body: ReactNode;
  if (id === '' || (query.error instanceof AppError && query.error.kind === 'notFound')) {
    body = <StateView icon="alert-circle" title="Talep bulunamadı" message="Talep kaldırılmış ya da size ait değil." />;
  } else if (query.isPending) {
    body = <StateView loading />;
  } else if (query.isError && !query.data) {
    body = <StateView title="Talep yüklenemedi" message={userMessage(query.error)} actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void query.refetch() }]} />;
  } else if (query.data) {
    body = <LeadContent lead={query.data} />;
  }

  return (
    <View style={styles.container} testID="lead-detail-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Talep Detayı" testID="lead-detail-back" right={<AdminBadge />} />
      {body}
    </View>
  );
}

function LeadContent({ lead }: { lead: Lead }) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const update = useUpdateLead(lead.id);
  const advisors = useAdvisorsQuery();
  const [pickAdvisor, setPickAdvisor] = useState(false);
  const open = lead.status === 'new' || lead.status === 'in_progress';

  return (
    <ScrollView contentContainerStyle={styles.content} testID="lead-detail-scroll">
      <Card style={styles.head}>
        <View style={styles.headRow}>
          <Text variant="heading" style={styles.flex}>
            {LEAD_TOPIC_LABELS[lead.topic]}
          </Text>
          <Badge label={leadStatusLabel(lead.status)} tone={LEAD_STATUS_TONES[lead.status]} />
        </View>
        <Text variant="small">{formatLeadDate(lead.createdAt)}</Text>
        {lead.appointmentAt && open ? (
          <View style={styles.appointment} testID="lead-appointment">
            <Icon name="calendar" size={18} color="success" />
            <Text variant="smallSemibold" color="success" style={styles.flex}>
              Randevu: {formatAppointment(lead.appointmentAt)}
            </Text>
          </View>
        ) : null}
        {!isAdmin && open ? (
          <View style={styles.info} testID="lead-advisor-notice">
            <Icon name="phone-call" size={18} color={INFO} />
            <Text variant="small" style={styles.infoText}>
              {lead.advisor ? `Danışmanınız ${lead.advisor.fullName} sizi arayacaktır.` : 'Danışmanınız sizi arayacaktır.'}
            </Text>
          </View>
        ) : null}
      </Card>

      {lead.listing ? (
        <Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`İlanı aç: ${lead.listing.title}`}
            onPress={() => router.push(listingHref(lead.listing!.id))}
            style={({ pressed }) => [styles.listing, pressed && styles.pressed]}
            testID="lead-listing">
            <ListingImage uri={lead.listing.coverImageUri} style={styles.thumb} iconSize={24} />
            <View style={styles.flex}>
              <Text variant="bodySemibold" numberOfLines={2}>
                {lead.listing.title}
              </Text>
              <Text variant="small">
                {formatMoney(lead.listing.price)} · İlan no: {lead.listing.listingNumber}
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color="textTertiary" />
          </Pressable>
        </Card>
      ) : null}

      {lead.plan ? (
        <Card style={styles.planCard}>
          <Text variant="subheading">Ödeme planı</Text>
          <FinancePlanSummary plan={lead.plan} testID="lead-plan" />
        </Card>
      ) : null}

      <Card>
        {isAdmin ? (
          <>
            <InfoRow icon="user" label="Müşteri" value={lead.customer.fullName} />
            <Divider inset={Spacing.three} />
          </>
        ) : null}
        <InfoRow icon="phone" label="Telefon" value={lead.contactPhone} />
        <Divider inset={Spacing.three} />
        <InfoRow icon="clock" label="Arama zamanı" value={leadWhen(lead)} />
        <Divider inset={Spacing.three} />
        <InfoRow
          icon="headphones"
          label="Danışman"
          value={lead.advisor?.fullName ?? 'Atanmadı'}
          onPress={isAdmin ? () => setPickAdvisor(true) : undefined}
          testID="lead-advisor"
        />
        {lead.note ? (
          <>
            <Divider inset={Spacing.three} />
            <View style={styles.noteBox}>
              <Text variant="smallMedium" color="textSecondary">
                Not
              </Text>
              <Text variant="body" testID="lead-note-text">
                {lead.note}
              </Text>
            </View>
          </>
        ) : null}
      </Card>

      {isAdmin ? (
        <>
          <Card style={styles.statusCard}>
            <Text variant="subheading">Durum</Text>
            <View style={styles.wrap}>
              {LEAD_STATUSES.map((value) => (
                <Chip
                  key={value}
                  label={leadStatusLabel(value)}
                  selected={lead.status === value}
                  onPress={() => {
                    if (value !== lead.status && !update.isPending) update.mutate({ status: value });
                  }}
                />
              ))}
            </View>
            {update.isPending ? <ActivityIndicator color={Colors.navy} /> : null}
            {update.isError ? (
              <Text variant="small" color="danger" accessibilityRole="alert" testID="lead-update-error">
                {userMessage(update.error)}
              </Text>
            ) : null}
            <Text variant="caption">Durum veya danışman değiştiğinde müşteriye bildirim gider.</Text>
          </Card>
          <AppointmentEditor lead={lead} />
          <Button title="Müşteriyi Ara" icon="phone" variant="navy" onPress={() => void Linking.openURL(telUrl(lead.contactPhone)).catch(() => undefined)} testID="lead-call-customer" />
          <OptionSheet
            visible={pickAdvisor}
            title="Danışman seçin"
            options={(advisors.data ?? []).map((advisor) => ({ value: advisor.id as string, label: advisor.fullName }))}
            selected={lead.advisor?.id ?? null}
            onSelect={(value) => {
              if (value && value !== lead.advisor?.id) update.mutate({ advisorId: asAdvisorId(value) });
            }}
            onClose={() => setPickAdvisor(false)}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

/** Madde 31: yönetici randevu tarihi ve saatini atar / değiştirir / kaldırır. Müşteriye bildirim gider; 24 saat kala hatırlatma otomatik. */
function AppointmentEditor({ lead }: { lead: Lead }) {
  const update = useUpdateLead(lead.id);
  const current = lead.appointmentAt ? new Date(lead.appointmentAt) : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const [day, setDay] = useState<string>(current ? toLocalDateKey(current) : (lead.preferredDate ?? toLocalDateKey(new Date())));
  const [time, setTime] = useState<string>(
    current ? `${pad(current.getHours())}:${pad(current.getMinutes())}` : lead.preferredSlot === 'noon' ? '12:00' : lead.preferredSlot === 'afternoon' ? '15:00' : '10:00',
  );
  const days = upcomingDays(14);
  const iso = appointmentIso(day, time);
  const unchanged = iso !== null && current !== null && new Date(iso).getTime() === current.getTime();

  return (
    <Card style={styles.statusCard}>
      <Text variant="subheading">Randevu</Text>
      <Text variant="small">
        {lead.appointmentAt ? `Mevcut randevu: ${formatAppointment(lead.appointmentAt)}` : `Müşterinin tercihi: ${leadWhen(lead)}`}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {days.map((key) => (
          <Chip key={key} label={dayLabel(key)} selected={day === key} onPress={() => setDay(key)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {APPOINTMENT_TIMES.map((value) => (
          <Chip key={value} label={value} selected={time === value} onPress={() => setTime(value)} />
        ))}
      </ScrollView>
      <Button
        title={lead.appointmentAt ? 'Randevuyu Güncelle' : 'Randevu Oluştur'}
        icon="calendar"
        disabled={iso === null || unchanged}
        loading={update.isPending}
        onPress={() => iso && update.mutate({ appointmentAt: iso })}
        testID="lead-appointment-save"
      />
      {lead.appointmentAt ? (
        <Button title="Randevuyu Kaldır" variant="outline" disabled={update.isPending} onPress={() => update.mutate({ appointmentAt: null })} testID="lead-appointment-clear" />
      ) : null}
      {update.isError ? (
        <Text variant="small" color="danger" accessibilityRole="alert">
          {userMessage(update.error)}
        </Text>
      ) : null}
      <Text variant="caption">Müşteriye bildirim gider; randevudan 24 saat önce müşteriye ve yöneticilere hatırlatma gönderilir.</Text>
    </Card>
  );
}

function InfoRow({ icon, label, value, onPress, testID }: { icon: IconName; label: string; value: string; onPress?: () => void; testID?: string }) {
  const content = (
    <>
      <Icon name={icon} size={20} color="textSecondary" />
      <Text variant="body" color="textSecondary" style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodySemibold" style={styles.value}>
        {value}
      </Text>
      {onPress ? <Icon name="chevron-right" size={20} color="textTertiary" /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.infoRow} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}, değiştir`} onPress={onPress} style={({ pressed }) => [styles.infoRow, pressed && styles.pressed]} testID={testID}>
      {content}
    </Pressable>
  );
}

/** `@/ui/Ui` Badge "info" tonunun yazı rengi (ilan detayıyla aynı). */
const INFO = '#1E4A7A';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  head: { padding: Spacing.three, gap: Spacing.two },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  infoText: { flex: 1, color: INFO },
  listing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two, paddingRight: Spacing.three },
  thumb: { width: 72, height: 54, borderRadius: Radius.sm },
  pressed: { backgroundColor: Colors.background },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  value: { flexShrink: 1, textAlign: 'right' },
  noteBox: { padding: Spacing.three, gap: Spacing.one },
  statusCard: { padding: Spacing.three, gap: Spacing.three },
  chipRow: { gap: Spacing.two, paddingRight: Spacing.three },
  appointment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  planCard: { padding: Spacing.three, gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
