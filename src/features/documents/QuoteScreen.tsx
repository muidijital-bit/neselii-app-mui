import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { computePlan, downPaymentOptions, formatInteger, formatMoney, formatRatePercent, userMessage, type Lead, type LeadListing } from '@/domain';
import { useFinanceSettings } from '@/features/finance/useFinance';
import { COMPANY_PHONE } from '@/features/listings/companyPhone';
import { useLeadQuery } from '@/features/leads/useLeadsQueries';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card, Chip } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { quoteHtml } from './quoteHtml';
import { useDocumentMutations } from './useDocuments';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- yerel modül yalnız PDF üretilirken yüklenir
const print = () => require('expo-print') as typeof import('expo-print');

const VALIDITY_DAYS = [3, 7, 15];
const tl = (kurus: number) => formatMoney({ amountKurus: kurus, currency: 'TRY' });
const pad = (n: number) => String(n).padStart(2, '0');
const trDate = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

/**
 * Madde 32 (yönetici): talepteki araç(lar) ve finansman senaryosundan PDF teklif. Teklif tutarı (indirim), ödeme şekli (peşin / kredili: peşinat
 * ve vade), geçerlilik ve not girilir; "PDF Oluştur ve Gönder" PDF'i cihazda üretir, müşterinin Belgelerim'ine yükler ve bildirim gönderir.
 */
export function QuoteScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string | string[] }>();
  const id = typeof leadId === 'string' ? leadId : '';
  const lead = useLeadQuery(id);
  const finance = useFinanceSettings();

  let body;
  if (lead.isPending || finance.isPending) body = <StateView loading />;
  else if (!lead.data) body = <StateView title="Talep yüklenemedi" message={userMessage(lead.error)} />;
  else body = <QuoteForm lead={lead.data} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="quote-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Teklif Oluştur" subtitle={lead.data?.customer.fullName} testID="quote-back" right={<AdminBadge />} />
      {body}
    </KeyboardAvoidingView>
  );
}

const parseTl = (text: string) => {
  const value = text.replace(/\D/g, '');
  return value ? Number(value) : 0;
};

function QuoteForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const finance = useFinanceSettings();
  const { upload } = useDocumentMutations();
  const vehicles: readonly LeadListing[] = lead.fleetListings.length ? lead.fleetListings : lead.listing ? [lead.listing] : [];
  const listTotal = vehicles.reduce((sum, v) => sum + v.price.amountKurus, 0);
  const [offer, setOffer] = useState(listTotal ? formatInteger(Math.round(listTotal / 100)) : '');
  const [credit, setCredit] = useState(lead.topic === 'financing' || lead.plan !== null);
  const options = finance.data ? downPaymentOptions(finance.data) : [30];
  const terms = finance.data?.terms ?? [12];
  const [downPercent, setDownPercent] = useState(lead.plan ? Math.round((lead.plan.downPaymentKurus / Math.max(1, lead.plan.priceKurus)) * 100) : (options[0] ?? 30));
  const [term, setTerm] = useState(lead.plan?.termMonths ?? terms[terms.length - 1] ?? 12);
  const [validity, setValidity] = useState(7);
  const [note, setNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const offerKurus = parseTl(offer) * 100;
  const plan = credit && finance.data && offerKurus > 0 ? computePlan(offerKurus, Math.round((offerKurus * downPercent) / 100), term, finance.data.monthlyRatePercent) : null;
  const discount = listTotal > offerKurus && offerKurus > 0 ? listTotal - offerKurus : 0;

  if (vehicles.length === 0) {
    return <StateView icon="alert-circle" title="Talepte araç yok" message="Teklif için talebin bir ilana bağlı olması gerekir." />;
  }

  const send = async () => {
    if (offerKurus <= 0) {
      setFailure('Teklif tutarını girin.');
      return;
    }
    setFailure(null);
    setGenerating(true);
    try {
      const now = new Date();
      const validUntil = new Date(now.getFullYear(), now.getMonth(), now.getDate() + validity);
      const quoteNo = `NO-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${lead.id.slice(0, 4).toUpperCase()}`;
      const html = quoteHtml({
        quoteNo,
        dateText: trDate(now),
        validUntilText: trDate(validUntil),
        customerName: lead.customer.fullName,
        customerPhone: lead.contactPhone,
        advisorName: lead.advisor?.fullName ?? 'Neşeli Otomotiv',
        vehicles: vehicles.map((v) => ({ title: v.title, listingNumber: v.listingNumber, priceText: tl(v.price.amountKurus) })),
        listTotalText: tl(listTotal),
        discountText: discount ? tl(discount) : null,
        offerTotalText: tl(offerKurus),
        planRows: plan
          ? [
              ['Peşinat', `${tl(plan.downPaymentKurus)} (%${downPercent})`],
              ['Kredi tutarı', tl(plan.creditKurus)],
              ['Vade', `${plan.termMonths} ay · aylık ${formatRatePercent(plan.monthlyRatePercent)} faiz`],
              ['Aylık taksit', tl(plan.monthlyPaymentKurus)],
              ['Toplam ödeme', tl(plan.totalPaymentKurus)],
            ]
          : [],
        note: note.trim() || null,
        companyPhone: COMPANY_PHONE,
      });
      const { uri } = await print().printToFileAsync({ html, width: 595, height: 842 });
      const title = `Teklif · ${vehicles.length > 1 ? `${vehicles.length} araç` : vehicles[0].title}`.slice(0, 120);
      await upload.mutateAsync({ customerId: lead.customer.id, leadId: lead.id, kind: 'quote', title, file: { uri, name: `${quoteNo}.pdf`, mimeType: 'application/pdf' } });
      router.back();
    } catch (error) {
      setFailure(userMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <Text variant="subheading">Araç{vehicles.length > 1 ? 'lar' : ''}</Text>
        {vehicles.map((v) => (
          <View key={v.id} style={styles.row}>
            <Text variant="body" numberOfLines={2} style={styles.flex}>
              {v.title}
            </Text>
            <Text variant="bodySemibold">{tl(v.price.amountKurus)}</Text>
          </View>
        ))}
      </Card>

      <TextField
        label="Teklif tutarı (TL)"
        value={offer}
        onChangeText={(t) => setOffer(parseTl(t) ? formatInteger(parseTl(t)) : '')}
        keyboardType="number-pad"
        helper={discount ? `İndirim: ${tl(discount)}` : 'İlan fiyatından düşük girerseniz fark teklifte indirim olarak gösterilir.'}
        testID="quote-amount"
      />

      <View style={styles.group}>
        <Text variant="smallMedium" color="textSecondary">
          Ödeme şekli
        </Text>
        <View style={styles.wrap}>
          <Chip label="Peşin" selected={!credit} onPress={() => setCredit(false)} />
          <Chip label="Kredili" selected={credit} onPress={() => setCredit(true)} />
        </View>
        {credit ? (
          <>
            <View style={styles.wrap}>
              {options.map((p) => (
                <Chip key={p} label={`%${p} peşinat`} selected={downPercent === p} onPress={() => setDownPercent(p)} />
              ))}
            </View>
            <View style={styles.wrap}>
              {terms.map((m) => (
                <Chip key={m} label={`${m} ay`} selected={term === m} onPress={() => setTerm(m)} />
              ))}
            </View>
          </>
        ) : null}
        {plan ? (
          <View style={styles.plan}>
            <Text variant="small">Aylık taksit</Text>
            <Text variant="price" style={styles.success}>
              {tl(plan.monthlyPaymentKurus)}
            </Text>
            <Text variant="caption">
              Peşinat {tl(plan.downPaymentKurus)} · Kredi {tl(plan.creditKurus)} · Toplam {tl(plan.totalPaymentKurus)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.group}>
        <Text variant="smallMedium" color="textSecondary">
          Geçerlilik
        </Text>
        <View style={styles.wrap}>
          {VALIDITY_DAYS.map((d) => (
            <Chip key={d} label={`${d} gün`} selected={validity === d} onPress={() => setValidity(d)} />
          ))}
        </View>
      </View>

      <TextField label="Not (isteğe bağlı)" value={note} onChangeText={setNote} multiline maxLength={800} style={styles.multiline} placeholder="Ör. Teslimat 5 iş günü içinde, muayene firmamızca yaptırılır." testID="quote-note" />

      {failure ? (
        <Text variant="small" color="danger" accessibilityRole="alert">
          {failure}
        </Text>
      ) : null}
      <Button title="PDF Oluştur ve Gönder" icon="send" loading={generating} onPress={() => void send()} testID="quote-send" />
      <Text variant="caption" align="center">
        PDF müşterinin Profil → Belgelerim ekranına düşer; “Teklifiniz hazır” bildirimi gider.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  card: { padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  group: { gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  plan: { backgroundColor: Colors.successSoft, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  success: { color: Colors.success },
  multiline: { minHeight: 80, paddingVertical: Spacing.two, textAlignVertical: 'top' },
});
