import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  DAMAGE_OPTIONS,
  LEAD_TIME_SLOT_LABELS,
  LEAD_TIME_SLOTS,
  MAX_MEDIA_PER_SECTION,
  TRADE_IN_CATEGORIES,
  TRADE_IN_SECTIONS,
  asListingId,
  formatInteger,
  formatMoney,
  isPlausiblePhone,
  isSafeEntityId,
  userMessage,
  type DamageStatus,
  type Lead,
  type LeadTimeSlot,
  type TradeInCategory,
  type TradeInKind,
  type TradeInSection,
  type TradeInUpload,
} from '@/domain';
import { leadHref } from '@/features/leads/routes';
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
import { Colors, Radius, Spacing } from '@/ui/theme';

import { useSubmitTradeIn } from './useTradeIns';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- yerel modül yalnız dosya seçilirken yüklenir
const imagePicker = () => require('expo-image-picker') as typeof import('expo-image-picker');

const digits = (text: string) => {
  const value = text.replace(/\D/g, '');
  return value ? Number(value) : null;
};
const groupDigits = (text: string) => {
  const value = digits(text);
  return value === null ? '' : formatInteger(value);
};

/**
 * Takas / araç satış başvurusu (madde 35, 36, 40). Takasta alınmak istenen ilan üstte gösterilir. Araç bilgileri, hasar durumu, beklenen fiyat ve
 * dış / iç / motor / kasa bölümleri için fotoğraf-video seçilir; gönderince talep açılır, danışman atanır ve dosyalar yüklenir.
 */
export function TradeInScreen() {
  const params = useLocalSearchParams<{ listingId?: string | string[]; kind?: string | string[] }>();
  const listingId = typeof params.listingId === 'string' && isSafeEntityId(params.listingId) ? params.listingId : '';
  const initialKind: TradeInKind = params.kind === 'trade_in' || params.kind === 'sell_vehicle' ? params.kind : listingId ? 'trade_in' : 'sell_vehicle';
  const [done, setDone] = useState<{ lead: Lead; failedUploads: number } | null>(null);

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="trade-in-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Takas / Aracımı Sat" testID="trade-in-back" />
      {done ? <TradeInDone result={done} /> : <TradeInForm listingId={listingId} initialKind={initialKind} onDone={setDone} />}
    </KeyboardAvoidingView>
  );
}

type Picked = TradeInUpload & { readonly key: string };

function TradeInForm({ listingId, initialKind, onDone }: { listingId: string; initialKind: TradeInKind; onDone: (r: { lead: Lead; failedUploads: number }) => void }) {
  const { session } = useSession();
  const listing = useListingQuery(listingId);
  const submit = useSubmitTradeIn();
  const [kind, setKind] = useState<TradeInKind>(initialKind);
  const [category, setCategory] = useState<TradeInCategory>('kamyon');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [km, setKm] = useState('');
  const [damage, setDamage] = useState<DamageStatus | null>(null);
  const [expected, setExpected] = useState('');
  const [files, setFiles] = useState<readonly Picked[]>([]);
  const [slot, setSlot] = useState<LeadTimeSlot>('any');
  const [phone, setPhone] = useState(session?.user.phone ?? '');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pick = async (section: TradeInSection) => {
    const ImagePicker = imagePicker();
    const already = files.filter((f) => f.section === section).length;
    const remaining = MAX_MEDIA_PER_SECTION - already;
    if (remaining <= 0) return;
    // iOS: videonun özgün dosyasına erişmek için galeri izni gerekir; verilmezse yalnız fotoğraf seçilir.
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: permission?.granted ? ['images', 'videos'] : ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (result.canceled) return;
    const picked = result.assets.slice(0, remaining).map(
      (asset, i): Picked => ({
        key: `${section}-${Date.now()}-${i}`,
        uri: asset.uri,
        section,
        kind: asset.type === 'video' ? 'video' : 'photo',
        mimeType: asset.mimeType ?? null,
      }),
    );
    const tooBig = result.assets.some((asset) => (asset.fileSize ?? 0) > 100 * 1024 * 1024);
    if (tooBig) Alert.alert('Dosya çok büyük', '100 MB üzerindeki dosyalar yüklenemez. Daha kısa bir video seçin.');
    setFiles((current) => [...current, ...picked.filter((_, i) => (result.assets[i]?.fileSize ?? 0) <= 100 * 1024 * 1024)]);
    setErrors((current) => ({ ...current, media: '' }));
  };

  const send = () => {
    const next: Record<string, string> = {};
    if (!brand.trim()) next.brand = 'Aracın markasını girin.';
    const yearValue = digits(year);
    if (yearValue !== null && (yearValue < 1950 || yearValue > new Date().getFullYear() + 1)) next.year = 'Geçerli bir model yılı girin.';
    if (files.length === 0) next.media = 'Değerlendirme için en az bir fotoğraf ekleyin.';
    if (!isPlausiblePhone(phone)) next.phone = 'Sizi arayabilmemiz için geçerli bir telefon numarası girin.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const expectedTl = digits(expected);
    submit.mutate(
      {
        kind,
        listingId: listingId ? asListingId(listingId) : null,
        vehicle: {
          category,
          brand,
          model: model.trim() || null,
          year: yearValue,
          km: digits(km),
          damageStatus: damage,
          expectedPriceKurus: expectedTl === null ? null : expectedTl * 100,
        },
        files,
        contactPhone: phone,
        preferredSlot: slot,
        note,
      },
      { onSuccess: onDone },
    );
  };

  const busy = submit.isPending;
  const detail = listing.data;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="trade-in-form">
      <View style={styles.group}>
        <Text variant="subheading">Ne yapmak istiyorsunuz?</Text>
        <View style={styles.wrap}>
          <Chip label="Takas (aracımı verip araç almak)" selected={kind === 'trade_in'} onPress={() => setKind('trade_in')} />
          <Chip label="Sadece aracımı satmak" selected={kind === 'sell_vehicle'} onPress={() => setKind('sell_vehicle')} />
        </View>
      </View>

      {kind === 'trade_in' && detail ? (
        <View style={styles.group}>
          <Text variant="smallMedium" color="textSecondary">
            Almak istediğiniz araç
          </Text>
          <Card style={styles.listing}>
            <ListingImage uri={detail.coverImageUri} style={styles.thumb} iconSize={24} />
            <View style={styles.flex}>
              <Text variant="bodySemibold" numberOfLines={2}>
                {detail.title}
              </Text>
              <Text variant="small">{formatMoney(detail.price)}</Text>
            </View>
          </Card>
        </View>
      ) : kind === 'trade_in' ? (
        <Text variant="small">Almak istediğiniz aracı danışmanımızla birlikte belirleyebilirsiniz. Takas farkı, ilan seçildiğinde hesaplanır.</Text>
      ) : null}

      <View style={styles.group}>
        <Text variant="subheading">Aracınız</Text>
        <View style={styles.wrap}>
          {TRADE_IN_CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </View>
        <TextField label="Marka" value={brand} onChangeText={setBrand} placeholder="Ör. Mercedes-Benz" error={errors.brand} testID="trade-in-brand" />
        <TextField label="Model (isteğe bağlı)" value={model} onChangeText={setModel} placeholder="Ör. Actros 1845" testID="trade-in-model" />
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField label="Model yılı" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="Ör. 2018" error={errors.year} testID="trade-in-year" />
          </View>
          <View style={styles.flex}>
            <TextField label="Kilometre" value={km} onChangeText={(t) => setKm(groupDigits(t))} keyboardType="number-pad" placeholder="Ör. 650.000" testID="trade-in-km" />
          </View>
        </View>
        <Text variant="smallMedium" color="textSecondary">
          Hasar durumu
        </Text>
        <View style={styles.wrap}>
          {DAMAGE_OPTIONS.map((d) => (
            <Chip key={d.id} label={d.label} selected={damage === d.id} onPress={() => setDamage(damage === d.id ? null : d.id)} />
          ))}
        </View>
        <TextField
          label="Beklediğiniz fiyat (TL, isteğe bağlı)"
          value={expected}
          onChangeText={(t) => setExpected(groupDigits(t))}
          keyboardType="number-pad"
          placeholder="Ör. 2.400.000"
          testID="trade-in-expected"
        />
      </View>

      <View style={styles.group}>
        <Text variant="subheading">Fotoğraf ve videolar</Text>
        <Text variant="small">Her bölüm için en fazla {MAX_MEDIA_PER_SECTION} dosya; videolar en fazla 60 saniye.</Text>
        {TRADE_IN_SECTIONS.map((section) => {
          const sectionFiles = files.filter((f) => f.section === section.id);
          return (
            <Card key={section.id} style={styles.mediaCard}>
              <View style={styles.mediaHead}>
                <View style={styles.flex}>
                  <Text variant="bodySemibold">{section.label}</Text>
                  <Text variant="caption">{section.hint}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${section.label} için fotoğraf veya video ekle`}
                  disabled={busy || sectionFiles.length >= MAX_MEDIA_PER_SECTION}
                  onPress={() => void pick(section.id)}
                  style={styles.addButton}
                  testID={`trade-in-add-${section.id}`}>
                  <Icon name="plus" size={18} color="white" />
                  <Text variant="smallSemibold" style={styles.white}>
                    Ekle
                  </Text>
                </Pressable>
              </View>
              {sectionFiles.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
                  {sectionFiles.map((file) => (
                    <View key={file.key} style={styles.mediaThumbWrap}>
                      {file.kind === 'photo' ? (
                        <ListingImage uri={file.uri} style={styles.mediaThumb} iconSize={20} />
                      ) : (
                        <View style={[styles.mediaThumb, styles.videoThumb]}>
                          <Icon name="play" size={24} color="white" />
                        </View>
                      )}
                      <Pressable
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Dosyayı kaldır"
                        disabled={busy}
                        onPress={() => setFiles((current) => current.filter((f) => f.key !== file.key))}
                        style={styles.removeThumb}>
                        <Icon name="x" size={14} color="white" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </Card>
          );
        })}
        {errors.media ? (
          <Text variant="caption" color="danger">
            {errors.media}
          </Text>
        ) : null}
      </View>

      <View style={styles.group}>
        <Text variant="subheading">İletişim</Text>
        <View style={styles.wrap}>
          {LEAD_TIME_SLOTS.map((value) => (
            <Chip key={value} label={LEAD_TIME_SLOT_LABELS[value]} selected={slot === value} onPress={() => setSlot(value)} />
          ))}
        </View>
        <TextField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" error={errors.phone} testID="trade-in-phone" />
        <TextField label="Notunuz (isteğe bağlı)" value={note} onChangeText={setNote} multiline maxLength={1000} style={styles.multiline} testID="trade-in-note" />
      </View>

      {submit.isError ? (
        <Text variant="small" color="danger" accessibilityRole="alert" testID="trade-in-error">
          {userMessage(submit.error)}
        </Text>
      ) : null}
      {submit.progress && submit.progress.total > 0 ? (
        <Text variant="small" align="center" testID="trade-in-progress">
          Dosyalar yükleniyor ({submit.progress.done}/{submit.progress.total})…
        </Text>
      ) : null}
      <Button title="Başvuruyu Gönder" icon="send" loading={busy} onPress={send} testID="trade-in-submit" />
    </ScrollView>
  );
}

function TradeInDone({ result }: { result: { lead: Lead; failedUploads: number } }) {
  const router = useRouter();
  const advisor = result.lead.advisor?.fullName;
  return (
    <ScrollView contentContainerStyle={styles.done} testID="trade-in-done">
      <View style={styles.doneIcon}>
        <Icon name="check" size={36} color="success" />
      </View>
      <Text variant="title" align="center" accessibilityRole="header">
        Başvurunuz alındı
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        {advisor ? `Danışmanınız ${advisor} aracınızı inceleyip ön değerlendirmeyi iletecek.` : 'Danışmanınız aracınızı inceleyip ön değerlendirmeyi iletecek.'}
      </Text>
      {result.failedUploads ? (
        <Text variant="small" color="danger" align="center">
          {result.failedUploads} dosya yüklenemedi. Danışmanınız gerekirse tekrar isteyecek.
        </Text>
      ) : null}
      <View style={styles.doneActions}>
        <Button title="Başvurumu Gör" variant="navy" onPress={() => router.replace(leadHref(result.lead.id))} testID="trade-in-open" />
        <Button title="Kapat" variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  white: { color: Colors.white },
  group: { gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.three },
  listing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two },
  thumb: { width: 72, height: 54, borderRadius: Radius.sm },
  mediaCard: { padding: Spacing.three, gap: Spacing.two },
  mediaHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Colors.navy,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    height: 36,
  },
  thumbs: { gap: Spacing.two },
  mediaThumbWrap: { position: 'relative' },
  mediaThumb: { width: 76, height: 76, borderRadius: Radius.sm },
  videoThumb: { backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  removeThumb: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(10,33,63,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiline: { minHeight: 80, paddingVertical: Spacing.two, textAlignVertical: 'top' },
  done: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  doneIcon: { width: 72, height: 72, borderRadius: Radius.pill, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  doneActions: { alignSelf: 'stretch', gap: Spacing.three, marginTop: Spacing.two },
});
