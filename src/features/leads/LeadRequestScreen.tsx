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
  isLeadTopic,
  isPlausiblePhone,
  parseFinancePlan,
  upcomingDays,
  userMessage,
  type FinancePlan,
  type Lead,
  type LeadTimeSlot,
  type LeadTopic,
} from '@/domain';
import { useListingQuery } from '@/features/listings/useListingsQueries';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useSession } from '@/features/session/SessionProvider';
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
 * "Beni Arayın" talep formu (ilan detayından). Konu (bilgi / finansman / görüntülü inceleme), uygun gün ve saat aralığı, telefon (profildeki
 * telefonla dolu gelir) ve isteğe bağlı not. Gönderimden sonra sunucunun atadığı danışmanın adıyla "Danışmanınız sizi arayacaktır" görünür.
 */
export function LeadRequestScreen() {
  const params = useLocalSearchParams<{ listingId?: string | string[]; topic?: string | string[]; plan?: string | string[] }>();
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
  const [created, setCreated] = useState<Lead | null>(null);

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="lead-request-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Beni Arayın" testID="lead-request-back" />
      {created ? <LeadCreated lead={created} /> : <LeadForm listingId={id} initialTopic={initialTopic} plan={plan} onCreated={setCreated} />}
    </KeyboardAvoidingView>
  );
}

function LeadForm({
  listingId,
  initialTopic,
  plan,
  onCreated,
}: {
  listingId: string;
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
    create.mutate(
      {
        listingId: listingId ? asListingId(listingId) : null,
        topic,
        preferredDate: day,
        preferredSlot: slot,
        contactPhone: phone,
        note,
        plan: attachedPlan ?? undefined,
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
      {detail ? (
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
        {advisor ? `Danışmanınız ${advisor} sizi arayacaktır.` : 'Danışmanınız sizi arayacaktır.'}
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
