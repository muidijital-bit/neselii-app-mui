import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppError, LEAD_STATUSES, LEAD_TOPIC_LABELS, REVENUE_RANGES, asAdvisorId, formatMoney, toLocalDateKey, upcomingDays, userMessage, type Lead } from '@/domain';
import { useAdvisorsQuery } from '@/features/advisors/useAdvisors';
import { LeadDocumentsCard } from '@/features/documents';
import { FinancePlanSummary } from '@/features/finance/FinancePlanSummary';
import { listingHref } from '@/features/listings/routes';
import { TradeInLeadSection } from '@/features/trade';
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
import { useLeadQuery, useReservation, useUpdateLead } from './useLeadsQueries';

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
        {lead.reservedUntil ? (
          <View style={styles.appointment} testID="lead-reserved">
            <Icon name="lock" size={18} color="success" />
            <Text variant="smallSemibold" color="success" style={styles.flex}>
              Araç {formatAppointment(lead.reservedUntil)} tarihine kadar {isAdmin ? 'bu müşteri için' : 'sizin için'} rezerve
            </Text>
          </View>
        ) : null}
        {lead.appointmentAt && open ? (
          <View style={styles.appointment} testID="lead-appointment">
            <Icon name="calendar" size={18} color="success" />
            <Text variant="smallSemibold" color="success" style={styles.flex}>
              Randevu: {formatAppointment(lead.appointmentAt)}
              {lead.appointmentLocation ? ` · ${lead.appointmentLocation}` : ''}
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

      {/* Adım 7: takas / satış aracı, medya, ön değerlendirme ve takas farkı. */}
      {lead.topic === 'trade_in' || lead.topic === 'sell_vehicle' ? <TradeInLeadSection lead={lead} isAdmin={isAdmin} /> : null}

      {/* Madde 52, 32: talebe gönderilen belgeler; yönetici belge yükler ve PDF teklif oluşturur. */}
      <LeadDocumentsCard lead={lead} isAdmin={isAdmin} />

      {lead.fleetListings.length ? (
        <Card style={styles.planCard}>
          <Text variant="subheading">Toplu teklif istenen araçlar ({lead.fleetListings.length})</Text>
          {lead.fleetListings.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => router.push(listingHref(item.id))}
              style={({ pressed }) => [styles.fleetRow, pressed && styles.pressed]}>
              <ListingImage uri={item.coverImageUri} style={styles.thumb} iconSize={20} />
              <View style={styles.flex}>
                <Text variant="smallSemibold" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text variant="caption">{formatMoney(item.price)} (talep anındaki fiyat)</Text>
              </View>
              <Icon name="chevron-right" size={20} color="textTertiary" />
            </Pressable>
          ))}
        </Card>
      ) : null}

      {lead.corporate ? (
        <Card style={styles.planCard}>
          <Text variant="subheading">Kurumsal başvuru</Text>
          <InfoRow icon="briefcase" label="Şirket" value={lead.corporate.companyName} />
          {lead.corporate.foundedYear ? <InfoRow icon="calendar" label="Kuruluş" value={`${lead.corporate.foundedYear} (${new Date().getFullYear() - lead.corporate.foundedYear} yıl)`} /> : null}
          {lead.corporate.activity ? <InfoRow icon="tool" label="Faaliyet" value={lead.corporate.activity} /> : null}
          {lead.corporate.revenueRange ? <InfoRow icon="trending-up" label="Yıllık ciro" value={REVENUE_RANGES.find((r) => r.id === lead.corporate!.revenueRange)?.label ?? ''} /> : null}
          {lead.corporate.vehicleCount !== null ? <InfoRow icon="truck" label="Araç sayısı" value={String(lead.corporate.vehicleCount)} /> : null}
          {lead.corporate.plannedDownPaymentKurus !== null ? <InfoRow icon="credit-card" label="Planlanan peşinat" value={formatMoney({ amountKurus: lead.corporate.plannedDownPaymentKurus, currency: 'TRY' })} /> : null}
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
          {lead.topic === 'reservation' && lead.listing ? <ReservationEditor lead={lead} /> : null}
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

const RESERVATION_DAYS = [1, 2, 3, 7];
const APPOINTMENT_LOCATIONS = ['Firmamızda', 'Müşterinin adresinde', 'Ekspertiz merkezinde'];

/** Madde 33: yönetici rezervasyonu onaylar (ilan seçilen gün kadar "Rezerve", süre dolunca otomatik yayına döner) ya da kaldırır. */
function ReservationEditor({ lead }: { lead: Lead }) {
  const { approve, release } = useReservation(lead.id);
  const [days, setDays] = useState(3);
  const error = approve.error ?? release.error;
  const reservationError = error instanceof AppError ? error.fieldErrors?.reservation : undefined;
  return (
    <Card style={styles.statusCard}>
      <Text variant="subheading">Rezervasyon</Text>
      {lead.reservedUntil ? (
        <>
          <Text variant="small">İlan {formatAppointment(lead.reservedUntil)} tarihine kadar rezerve. Süre dolunca otomatik yeniden yayına girer.</Text>
          <Button title="Rezervasyonu Kaldır" variant="outline" loading={release.isPending} onPress={() => release.mutate()} testID="lead-reservation-release" />
        </>
      ) : (
        <>
          <Text variant="small">Onaylanınca ilan “Rezerve” görünür ve müşteriye bildirim gider.</Text>
          <View style={styles.wrapRow}>
            {RESERVATION_DAYS.map((value) => (
              <Chip key={value} label={`${value} gün`} selected={days === value} onPress={() => setDays(value)} />
            ))}
          </View>
          <Button title="Rezervasyonu Onayla" icon="lock" loading={approve.isPending} onPress={() => approve.mutate(days)} testID="lead-reservation-approve" />
        </>
      )}
      {error ? (
        <Text variant="small" color="danger" accessibilityRole="alert">
          {reservationError ?? userMessage(error)}
        </Text>
      ) : null}
    </Card>
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
  const [location, setLocation] = useState<string | null>(lead.appointmentLocation);
  const unchanged = iso !== null && current !== null && new Date(iso).getTime() === current.getTime() && location === lead.appointmentLocation;

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
      {/* Madde 39: randevu yeri (ekspertiz / inceleme). */}
      <View style={styles.wrapRow}>
        {APPOINTMENT_LOCATIONS.map((value) => (
          <Chip key={value} label={value} selected={location === value} onPress={() => setLocation(location === value ? null : value)} />
        ))}
      </View>
      <Button
        title={lead.appointmentAt ? 'Randevuyu Güncelle' : 'Randevu Oluştur'}
        icon="calendar"
        disabled={iso === null || unchanged}
        loading={update.isPending}
        onPress={() => iso && update.mutate({ appointmentAt: iso, appointmentLocation: location })}
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
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  fleetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one },
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
