import { useQueries } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppError,
  LEAD_TIME_SLOT_LABELS,
  LEAD_TIME_SLOTS,
  LEAD_TOPIC_LABELS,
  LEAD_TOPICS,
  asListingId,
  formatMoney,
  REVENUE_RANGES,
  SECTORS,
  formatInteger,
  isLeadTopic,
  isPlausiblePhone,
  isSafeEntityId,
  parseFinancePlan,
  upcomingDays,
  userMessage,
  type FinancePlan,
  type Lead,
  type RevenueRange,
  type LeadTimeSlot,
  type LeadTopic,
} from '@/domain';
import { listingsKeys, useListingQuery } from '@/features/listings/useListingsQueries';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useMembership } from '@/features/company/useCompany';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card, Chip } from '@/ui/Ui';
import { FinancePlanSummary } from '@/features/finance/FinancePlanSummary';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { LEAD_TOPIC_ICONS, dayLabel, leadWhen } from './presentation';
import { leadHref } from './routes';
import { useCreateLead } from './useLeadsQueries';

/** Gün seçiminde gösterilen gün sayısı (bugün dahil). */
const DAY_COUNT = 7;

/**
 * "Beni Arayın" talep formu (ilan detayından; toplu teklifte karşılaştırma ekranından). Konu (bilgi / finansman / inceleme / ekspertiz / sigorta / rezervasyon), uygun gün ve saat aralığı, telefon (profildeki
 * telefonla dolu gelir) ve isteğe bağlı not. Gönderimden sonra sunucunun atadığı danışmanın adıyla "Danışmanınız sizi arayacaktır" görünür.
 */
export function LeadRequestScreen() {
  const params = useLocalSearchParams<{ listingId?: string | string[]; topic?: string | string[]; plan?: string | string[]; fleet?: string | string[] }>();
  const id = typeof params.listingId === 'string' ? params.listingId.trim() : '';
  const initialTopic = isLeadTopic(params.topic) ? params.topic : 'info';
  const plan = useMemo(() => {
    if (typeof params.plan !== 'string') return null;
    try {
      return parseFinancePlan(JSON.parse(params.plan));
    } catch {
      return null;
    }
  }, [params.plan]);
  // Madde 44: karşılaştırma ekranından toplu teklif (virgülle ayrılmış ilan kimlikleri, en çok 3).
  const fleetIds = useMemo(
    () => (typeof params.fleet === 'string' ? params.fleet.split(',').map((v) => v.trim()).filter(isSafeEntityId).slice(0, 10) : []),
    [params.fleet],
  );
  const [created, setCreated] = useState<Lead | null>(null);
  const title = fleetIds.length > 1 ? 'Toplu Teklif' : initialTopic === 'reservation' ? 'Rezervasyon' : 'Beni Arayın';

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="lead-request-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title={title} testID="lead-request-back" />
      {created ? (
        <LeadCreated lead={created} />
      ) : (
        <LeadForm listingId={id} initialTopic={fleetIds.length > 1 ? 'fleet_quote' : initialTopic} plan={plan} fleetIds={fleetIds} onCreated={setCreated} />
      )}
    </KeyboardAvoidingView>
  );
}

function LeadForm({
  listingId,
  initialTopic,
  plan,
  fleetIds,
  onCreated,
}: {
  listingId: string;
  /** Toplu teklifte ilanlar (2–3); doluysa konu sabit "Toplu teklif". */
  fleetIds: readonly string[];
  initialTopic: LeadTopic;
  /** Hesaplayıcıdan gelen plan: yalnız konu "Finansman" iken talebe eklenir. */
  plan: FinancePlan | null;
  onCreated: (lead: Lead) => void;
}) {
  const { session } = useSession();
  const listing = useListingQuery(listingId);
  const create = useCreateLead();
  const days = useMemo(() => upcomingDays(DAY_COUNT), []);
  const [topic, setTopic] = useState<LeadTopic>(initialTopic);
  const attachedPlan = topic === 'financing' ? plan : null;
  // Madde 21: finansman talebinde şirket adına başvuru.
  const [corporate, setCorporate] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [activity, setActivity] = useState<string | null>(null);
  const [revenue, setRevenue] = useState<RevenueRange | null>(null);
  const [vehicleCount, setVehicleCount] = useState('');
  const [plannedDown, setPlannedDown] = useState('');
  const [companyError, setCompanyError] = useState<string | undefined>();
  const isCorporate = topic === 'financing' && corporate;
  // Madde 47/51: kurumsal hesap üyesi şirket adına gönderebilir; talep eden rolünde şirket onayına gider.
  const membership = useMembership();
  const [forCompany, setForCompany] = useState(true);
  const company = membership.data ?? null;
  const sendForCompany = company !== null && forCompany;
  const fleet = fleetIds.length > 1;
  const { listings: listingsService } = useServices();
  const userId = session?.user.id ?? null;
  const fleetQueries = useQueries({
    queries: (fleet ? fleetIds : []).map((fid) => ({ queryKey: listingsKeys.detail(userId, fid), queryFn: () => listingsService.getListing(asListingId(fid)) })),
  });
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<LeadTimeSlot>('any');
  const [phone, setPhone] = useState(session?.user.phone ?? '');
  const [note, setNote] = useState('');
  const [phoneError, setPhoneError] = useState<string | undefined>();

  const submit = () => {
    if (!isPlausiblePhone(phone)) {
      setPhoneError('Sizi arayabilmemiz için geçerli bir telefon numarası girin.');
      return;
    }
    setPhoneError(undefined);
    if (isCorporate && !companyName.trim()) {
      setCompanyError('Şirket adını girin.');
      return;
    }
    setCompanyError(undefined);
    const toInt = (text: string) => {
      const d = text.replace(/\D/g, '');
      return d ? Number(d) : null;
    };
    create.mutate(
      {
        listingId: listingId ? asListingId(listingId) : null,
        topic,
        preferredDate: day,
        preferredSlot: slot,
        contactPhone: phone,
        note,
        plan: attachedPlan ?? undefined,
        fleetListingIds: fleet ? fleetIds.map(asListingId) : undefined,
        companyId: sendForCompany ? company!.company.id : undefined,
        corporate: isCorporate
          ? {
              companyName,
              foundedYear: toInt(foundedYear),
              activity,
              revenueRange: revenue,
              vehicleCount: toInt(vehicleCount),
              plannedDownPaymentKurus: toInt(plannedDown) === null ? null : toInt(plannedDown)! * 100,
            }
          : undefined,
      },
      {
        onSuccess: onCreated,
        onError: (error) => {
          const fieldError = error instanceof AppError ? error.fieldErrors?.contactPhone : undefined;
          if (fieldError) setPhoneError(fieldError);
        },
      },
    );
  };

  const detail = listing.data;
  const failure = create.isError && !(create.error instanceof AppError && create.error.fieldErrors?.contactPhone) ? userMessage(create.error) : null;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="lead-request-form">
      {fleet ? (
        <View style={styles.group} testID="lead-request-fleet">
          <Text variant="subheading">{fleetIds.length} araç için toplu teklif</Text>
          {fleetQueries.map((q, i) =>
            q.data ? (
              <Card key={fleetIds[i]} style={styles.listing}>
                <ListingImage uri={q.data.coverImageUri} style={styles.thumb} iconSize={24} />
                <View style={styles.flex}>
                  <Text variant="bodySemibold" numberOfLines={2}>
                    {q.data.title}
                  </Text>
                  <Text variant="small">{formatMoney(q.data.price)}</Text>
                </View>
              </Card>
            ) : null,
          )}
          <Text variant="small">Danışmanımız araçlar için toplu fiyat ve ödeme seçenekleriyle size dönecek.</Text>
        </View>
      ) : detail ? (
        <Card style={styles.listing}>
          <ListingImage uri={detail.coverImageUri} style={styles.thumb} iconSize={24} />
          <View style={styles.flex}>
            <Text variant="bodySemibold" numberOfLines={2}>
              {detail.title}
            </Text>
            <Text variant="small">
              {formatMoney(detail.price)} · İlan no: {detail.listingNumber}
            </Text>
          </View>
        </Card>
      ) : null}

      {fleet ? null : (
      <View style={styles.group}>
        <Text variant="subheading">Konu</Text>
        <View style={styles.topics}>
          {LEAD_TOPICS.map((value) => {
            const selected = value === topic;
            return (
              <Button
                key={value}
                title={LEAD_TOPIC_LABELS[value]}
                icon={LEAD_TOPIC_ICONS[value]}
                variant={selected ? 'navy' : 'outline'}
                accessibilityState={{ selected }}
                onPress={() => setTopic(value)}
                testID={`lead-topic-${value}`}
              />
            );
          })}
        </View>
      </View>
      )}

      {company ? (
        <View style={styles.group} testID="lead-request-company">
          <Text variant="subheading">Kimin adına?</Text>
          <View style={styles.wrap}>
            <Chip label={`Şirketim: ${company.company.name}`} selected={forCompany} onPress={() => setForCompany(true)} />
            <Chip label="Kendi adıma" selected={!forCompany} onPress={() => setForCompany(false)} />
          </View>
          {forCompany && company.role === 'requester' ? (
            <Text variant="caption">Talebiniz şirket yöneticinizin onayından sonra Neşeli Otomotiv’e iletilir.</Text>
          ) : null}
        </View>
      ) : null}

      {topic === 'financing' ? (
        <View style={styles.group} testID="lead-request-corporate">
          <Text variant="subheading">Başvuru türü</Text>
          <View style={styles.wrap}>
            <Chip label="Bireysel" selected={!corporate} onPress={() => setCorporate(false)} />
            <Chip label="Şirket adına (kurumsal)" selected={corporate} onPress={() => setCorporate(true)} />
          </View>
          {corporate ? (
            <>
              <TextField
                label="Şirket adı"
                value={companyName}
                onChangeText={(t) => {
                  setCompanyName(t);
                  if (companyError) setCompanyError(undefined);
                }}
                maxLength={120}
                error={companyError}
                testID="lead-company-name"
              />
              <View style={styles.pair}>
                <View style={styles.flex}>
                  <TextField label="Kuruluş yılı" value={foundedYear} onChangeText={setFoundedYear} keyboardType="number-pad" placeholder="Ör. 2012" testID="lead-company-founded" />
                </View>
                <View style={styles.flex}>
                  <TextField label="Filodaki araç sayısı" value={vehicleCount} onChangeText={setVehicleCount} keyboardType="number-pad" placeholder="Ör. 8" testID="lead-company-vehicles" />
                </View>
              </View>
              <Text variant="smallMedium" color="textSecondary">
                Faaliyet alanı
              </Text>
              <View style={styles.wrap}>
                {[...SECTORS.map((s) => s.label), 'Diğer'].map((label) => (
                  <Chip key={label} label={label} selected={activity === label} onPress={() => setActivity(activity === label ? null : label)} />
                ))}
              </View>
              <Text variant="smallMedium" color="textSecondary">
                Yıllık ciro
              </Text>
              <View style={styles.wrap}>
                {REVENUE_RANGES.map((r) => (
                  <Chip key={r.id} label={r.label} selected={revenue === r.id} onPress={() => setRevenue(revenue === r.id ? null : r.id)} />
                ))}
              </View>
              <TextField
                label="Planlanan peşinat (TL)"
                value={plannedDown}
                onChangeText={(t) => setPlannedDown(t.replace(/\D/g, '') ? formatInteger(Number(t.replace(/\D/g, ''))) : '')}
                keyboardType="number-pad"
                testID="lead-company-down"
              />
              <Text variant="caption">Kurumsal başvuruda danışmanınız bilanço, vergi levhası ve faaliyet belgesi isteyebilir.</Text>
            </>
          ) : null}
        </View>
      ) : null}

      {attachedPlan ? (
        <View style={styles.group}>
          <Text variant="subheading">Ödeme planınız</Text>
          <FinancePlanSummary plan={attachedPlan} testID="lead-request-plan" />
        </View>
      ) : null}

      <View style={styles.group}>
        <Text variant="subheading">Size uygun gün</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Fark etmez" selected={day === null} onPress={() => setDay(null)} />
          {days.map((key) => (
            <Chip key={key} label={dayLabel(key)} selected={day === key} onPress={() => setDay(key)} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.group}>
        <Text variant="subheading">Saat aralığı</Text>
        <View style={styles.wrap}>
          {LEAD_TIME_SLOTS.map((value) => (
            <Chip key={value} label={LEAD_TIME_SLOT_LABELS[value]} selected={slot === value} onPress={() => setSlot(value)} />
          ))}
        </View>
      </View>

      <TextField
        label="Telefon"
        value={phone}
        onChangeText={(text) => {
          setPhone(text);
          if (phoneError) setPhoneError(undefined);
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="05xx xxx xx xx"
        error={phoneError}
        testID="lead-phone"
      />
      <TextField
        label="Notunuz (isteğe bağlı)"
        value={note}
        onChangeText={setNote}
        placeholder="Ör. peşinat tutarım, takas düşüncem…"
        multiline
        maxLength={1000}
        style={styles.note}
        testID="lead-note"
      />

      {failure ? (
        <Text variant="small" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite" testID="lead-request-error">
          {failure}
        </Text>
      ) : null}
      <Button title="Talebi Gönder" icon="send" loading={create.isPending} onPress={submit} testID="lead-submit" />
    </ScrollView>
  );
}

function LeadCreated({ lead }: { lead: Lead }) {
  const router = useRouter();
  const advisor = lead.advisor?.fullName;
  return (
    <ScrollView contentContainerStyle={styles.done} testID="lead-request-done">
      <View style={styles.doneIcon}>
        <Icon name="check" size={36} color="success" />
      </View>
      <Text variant="title" align="center" accessibilityRole="header">
        Talebiniz alındı
      </Text>
      <Text variant="body" color="textSecondary" align="center" testID="lead-request-done-message">
        {lead.approvalStatus === 'pending'
          ? 'Talebiniz şirket yöneticinizin onayına gönderildi. Onaylanınca danışmanınız sizi arayacak.'
          : advisor
            ? `Danışmanınız ${advisor} sizi arayacaktır.`
            : 'Danışmanınız sizi arayacaktır.'}
      </Text>
      <Card style={styles.summary}>
        <SummaryRow icon="clock" label="Arama zamanı" value={leadWhen(lead)} />
        <SummaryRow icon="phone" label="Telefon" value={lead.contactPhone} />
      </Card>
      <View style={styles.doneActions}>
        <Button title="Talebimi Gör" variant="navy" onPress={() => router.replace(leadHref(lead.id))} testID="lead-request-open" />
        <Button title="İlana Dön" variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} testID="lead-request-close" />
      </View>
    </ScrollView>
  );
}

function SummaryRow({ icon, label, value }: { icon: 'clock' | 'phone'; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Icon name={icon} size={18} color="textSecondary" />
      <Text variant="small" style={styles.flex}>
        {label}
      </Text>
      <Text variant="smallSemibold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  listing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two },
  thumb: { width: 72, height: 54, borderRadius: Radius.sm },
  group: { gap: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.three },
  topics: { gap: Spacing.two },
  chips: { gap: Spacing.two, paddingRight: Spacing.three },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  note: { minHeight: 96, paddingVertical: Spacing.two, textAlignVertical: 'top' },
  done: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { alignSelf: 'stretch', padding: Spacing.three, gap: Spacing.two },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  doneActions: { alignSelf: 'stretch', gap: Spacing.three, marginTop: Spacing.two },
});
