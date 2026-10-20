import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { StripePlaceholder } from '@/components/StripePlaceholder';
import { Icon, type IconName } from '@/components/icons/Icon';
import { AppError, userMessage, type ListingDetail } from '@/domain';
import { useFavoriteToggle } from '@/features/saved/useFavorites';
import { colors, fontFamily, radii, shadows, sizes, spacing, textStyles } from '@/theme';

import { StateMessage } from './ListStates';
import { useIsAdmin } from '@/features/session/useIsAdmin';

import { callCompany } from './companyPhone';
import { toDetailModel } from './presentation';
import { listingContactHref, listingMediaHref } from './routes';
import { useListingQuery } from './useListingsQueries';


const HERO_HEIGHT = 280;
/** Açıklama bu uzunluğu aşarsa "Devamını oku" çıkar (tasarım 07: dört satırda kesilir). */
const DESCRIPTION_PREVIEW_CHARS = 140;
const DESCRIPTION_PREVIEW_LINES = 4;

/**
 * İlan detayı (07). Tek kaynak `listingId` rota parametresidir; gövde ID ile anahtarlanır, böylece parametre değişince önceki ilanın
 * açıklama aç/kapat ve bildirim durumu taşınmaz. Boş/dizi ID doğrudan "bulunamadı"dır (servis çağrılmaz).
 */
export function ListingDetailScreen() {
  const { listingId } = useLocalSearchParams<{ listingId?: string | string[] }>();
  const id = typeof listingId === 'string' ? listingId.trim() : '';
  return <ListingDetailBody key={id} listingId={id} />;
}

function useGoBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/'));
}

function ListingDetailBody({ listingId }: { listingId: string }) {
  const query = useListingQuery(listingId);
  const goBack = useGoBack();

  if (listingId === '') return <DetailMessage kind="notFound" onBack={goBack} />;
  if (query.isPending) return <DetailLoading onBack={goBack} />;
  // Önbellek yalnızca GEÇİCİ hatalarda (offline/zaman aşımı/bilinmeyen) korunur: arka plan yenilemesi başarısız olsa da son bilinen detay
  // gösterilir. Varlık/erişim sonuçları (notFound, unauthenticated) eski veri olsa bile ilanı ve eylemlerini kaldırır.
  const error = query.isError ? query.error : null;
  const kind = error instanceof AppError ? error.kind : null;
  if (kind === 'notFound') return <DetailMessage kind="notFound" onBack={goBack} />;
  if (kind === 'unauthenticated') {
    return (
      <DetailFrame onBack={goBack}>
        <StateMessage
          icon="info"
          title="Oturum gerekli"
          message={userMessage(error)}
          actionLabel="Geri dön"
          actionIcon="arrow-left"
          onAction={goBack}
          testID="listing-unauthenticated"
        />
      </DetailFrame>
    );
  }
  if (error && !query.data) {
    const offline = kind === 'offline';
    return (
      <DetailFrame onBack={goBack}>
        <StateMessage
          icon="info"
          title={offline ? 'Bağlantı yok' : 'İlan yüklenemedi'}
          message={userMessage(error)}
          actionLabel="Tekrar dene"
          onAction={() => void query.refetch()}
          testID="listing-error"
        />
      </DetailFrame>
    );
  }
  if (!query.data) return <DetailLoading onBack={goBack} />;
  if (query.data.status === 'withdrawn') return <DetailMessage kind="withdrawn" onBack={goBack} />;
  return <DetailContent detail={query.data} onBack={goBack} />;
}

/** Yükleme/hata durumlarının ortak çerçevesi: sabit geri düğmesi + içerik. */
function DetailFrame({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <Screen background={colors.white} testID="listing-screen">
      <View style={styles.frameBar}>
        <BackButton onPress={onBack} testID="listing-back" />
      </View>
      <ScrollView contentContainerStyle={styles.frameBody}>{children}</ScrollView>
    </Screen>
  );
}

function DetailLoading({ onBack }: { onBack: () => void }) {
  return (
    <DetailFrame onBack={onBack}>
      <View accessible accessibilityLabel="İlan yükleniyor" accessibilityState={{ busy: true }} style={styles.skeleton} testID="listing-loading">
        <View style={styles.skeletonHero} />
        <View style={[styles.bar, { width: '40%', height: 12 }]} />
        <View style={[styles.bar, { width: '90%', height: 20 }]} />
        <View style={[styles.bar, { width: '60%', height: 12 }]} />
        <View style={[styles.bar, { width: '45%', height: 26, marginTop: spacing.md }]} />
      </View>
    </DetailFrame>
  );
}

function DetailMessage({ kind, onBack }: { kind: 'notFound' | 'withdrawn'; onBack: () => void }) {
  const withdrawn = kind === 'withdrawn';
  return (
    <DetailFrame onBack={onBack}>
      <StateMessage
        icon={withdrawn ? 'eye-off' : 'search-x'}
        title={withdrawn ? 'Bu ilan yayından kaldırıldı' : 'İlan bulunamadı'}
        message={
          withdrawn
            ? 'İlan sahibi tarafından yayından kaldırıldığı için fotoğraflar ve iletişim kullanılamıyor. Benzer ilanlar için aramaya dönebilirsiniz.'
            : 'Aradığınız ilan kaldırılmış olabilir ya da bağlantı hatalı. Geri dönüp başka bir ilan seçebilirsiniz.'
        }
        actionLabel="Geri dön"
        actionIcon="arrow-left"
        onAction={onBack}
        testID={withdrawn ? 'listing-withdrawn' : 'listing-not-found'}
      />
    </DetailFrame>
  );
}

function BackButton({ onPress, testID }: { onPress: () => void; testID: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={onPress} style={styles.roundButton} testID={testID}>
      <Icon name={Platform.OS === 'ios' ? 'chevron-left' : 'arrow-left'} size={Platform.OS === 'ios' ? 24 : 22} color={colors.navy} />
    </Pressable>
  );
}

function RoundAction({
  icon,
  label,
  onPress,
  active = false,
  busy = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Seçili durum (ör. favoride): kırmızı dolu simge (tasarım 07: `#d4183d`). */
  active?: boolean;
  busy?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, busy }}
      disabled={busy}
      onPress={onPress}
      style={styles.roundButton}
      testID={testID}>
      <Icon name={icon} size={19} color={active ? colors.danger : colors.navy} filled={active} />
    </Pressable>
  );
}

/** Bu yazı ölçeğinden büyükte alt eylem düğmeleri alt alta dizilir. */
const STACK_ACTIONS_MIN_FONT_SCALE = 1.3;

function DetailContent({ detail, onBack }: { detail: ListingDetail; onBack: () => void }) {
  const stackActions = useWindowDimensions().fontScale > STACK_ACTIONS_MIN_FONT_SCALE;
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const favorites = useFavoriteToggle();
  const favorite = favorites.isFavorite(detail.id);
  // Favori hatası (geri alma sonrası) eylem uyarısının yerine görünür; yeni eylem ikisini de temizler.
  const shownNotice = favorites.failure ?? notice;
  const model = toDetailModel(detail, Date.now());
  const sold = detail.status === 'sold';
  const longDescription = model.description.length > DESCRIPTION_PREVIEW_CHARS;
  const hasVideo = detail.media.some((item) => item.kind === 'video');

  // Paylaşım yalnızca RN Share ile başlık/ilan no metni hazırlar; web URL'si uydurulmaz.
  const share = () => {
    void Share.share({ message: model.shareText }).catch(() => undefined);
  };

  return (
    <Screen background={colors.white} edges={['left', 'right', 'bottom']} testID="listing-screen">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} testID="listing-scroll">
        <View style={[styles.hero, { height: HERO_HEIGHT + insets.top }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fotoğraf ve videoları aç"
            onPress={() => router.push(listingMediaHref(detail.id))}
            style={StyleSheet.absoluteFill}
            testID="listing-hero">
            {detail.coverImageUri ? (
              <Image source={{ uri: detail.coverImageUri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
            ) : (
              <>
                <StripePlaceholder width={1200} height={HERO_HEIGHT + insets.top} stripe={8} />
                <View style={styles.heroLabel} pointerEvents="none">
                  <Text style={[textStyles.mono, styles.heroLabelText, styles.heroMono]}>araç fotoğrafı · kapak</Text>
                </View>
              </>
            )}
          </Pressable>
          <View style={[styles.heroTop, { top: insets.top + spacing.lg }]} pointerEvents="box-none">
            <BackButton onPress={onBack} testID="listing-back" />
            <View style={styles.heroActions}>
              <RoundAction icon="share-2" label="Paylaş" onPress={share} testID="listing-share" />
              <RoundAction
                icon="heart"
                label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                active={favorite}
                busy={favorites.isPending(detail.id)}
                onPress={() => {
                  setNotice(null);
                  favorites.toggle(detail.id, detail);
                }}
                testID="listing-favorite"
              />
            </View>
          </View>
          <View style={styles.heroBottom} pointerEvents="none">
            {detail.photoCount > 0 ? (
              <View style={styles.mediaChip} testID="listing-photo-count">
                <Icon name="camera" size={14} color={colors.white} />
                <Text style={styles.mediaChipText}>{`1 / ${detail.photoCount}`}</Text>
              </View>
            ) : null}
            {hasVideo ? (
              <View style={styles.mediaChip} testID="listing-video-chip">
                <Icon name="play" size={12} color={colors.white} />
                <Text style={styles.mediaChipText}>Video</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.head}>
          <Text style={styles.kicker} testID="listing-kicker">
            {model.kicker}
          </Text>
          <Text style={styles.title} accessibilityRole="header" testID="listing-title">
            {model.title}
          </Text>
          <View style={styles.metaRow}>
            <Icon name="map-pin" size={14} color={colors.slateLight} />
            <Text style={styles.meta} testID="listing-meta">
              {`${model.location} · ${model.dateLabel} · İlan no: ${model.listingNumber}`}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price} testID="listing-price">
              {model.price}
            </Text>
            {model.status ? <Badge variant={model.status} testID="listing-status" /> : null}
          </View>
          {model.financing ? (
            <View style={styles.financing} testID="listing-financing">
              <Icon name="credit-card" size={20} color={colors.greenText} />
              <Text style={styles.financingText}>{model.financing}</Text>
            </View>
          ) : null}
        </View>

        {sold ? (
          <View style={styles.soldBox} testID="listing-sold-notice">
            <Icon name="info" size={18} color={colors.blue} />
            <Text style={styles.soldText}>Bu ilan satıldı. Fotoğrafları inceleyebilirsiniz; yeni görüşme başlatılamaz.</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Özellikler
          </Text>
          {model.specRows.map((row) => (
            <View key={row.key} style={styles.specRow} testID={`listing-spec-${row.key}`}>
              <Text style={styles.specKey}>{row.label}</Text>
              <Text style={styles.specValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, styles.descriptionSection]}>
          <Text style={[styles.sectionTitle, styles.descriptionTitle]} accessibilityRole="header">
            Açıklama
          </Text>
          <Text style={styles.description} numberOfLines={expanded || !longDescription ? undefined : DESCRIPTION_PREVIEW_LINES} testID="listing-description">
            {model.description}
          </Text>
          {longDescription ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded((open) => !open)}
              style={styles.more}
              testID="listing-description-toggle">
              <Text style={styles.moreText}>{expanded ? 'Daha az göster' : 'Devamını oku'}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.assurance}>
          <View style={styles.assuranceIcon}>
            <BrandLogo variant="emblem" height={18} accessibilityLabel="Neşeli Otomotiv" testID="listing-assurance-emblem" />
          </View>
          <View style={styles.assuranceText}>
            <Text style={styles.assuranceTitle}>Neşeli Otomotiv güvencesi</Text>
            <Text style={styles.assuranceBody}>Bu ilan firmamızın kendi filosundandır; ilan doğrudan Neşeli Otomotiv tarafından yayımlanır.</Text>
          </View>
        </View>
      </ScrollView>

      {shownNotice ? (
        <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="listing-notice">
          <Icon name="info" size={18} color={colors.blue} />
          <Text style={styles.noticeText}>{shownNotice}</Text>
        </View>
      ) : null}
      {/* Yönetici firmanın kendisidir: firmayı arama / firmaya mesaj başlatma eylemleri gösterilmez. */}
      {isAdmin ? null : (
        <View style={[styles.bottomBar, stackActions && styles.bottomBarStacked]}>
          <View style={stackActions ? styles.slotStacked : styles.callSlot}>
            <Btn
              label="Hemen Ara"
              variant="secondary"
              icon="phone"
              disabled={sold}
              onPress={() => callCompany(setNotice)}
              testID="listing-call"
            />
          </View>
          <View style={stackActions ? styles.slotStacked : styles.messageSlot}>
            <Btn label="Mesaj Gönder" icon="message-circle" disabled={sold} onPress={() => router.push(listingContactHref(detail.id))} testID="listing-contact" />
          </View>
        </View>
      )}
    </Screen>
  );
}

const roundShadow = shadows.floating;

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  frameBar: { height: 56, justifyContent: 'center', paddingHorizontal: spacing.lg },
  frameBody: { flexGrow: 1 },
  skeleton: { gap: spacing.lg, paddingHorizontal: spacing.xl },
  skeletonHero: { height: HERO_HEIGHT - 56, borderRadius: radii.card, backgroundColor: colors.lineSoft },
  bar: { borderRadius: radii.xs, backgroundColor: colors.lineSoft },
  hero: { overflow: 'hidden', backgroundColor: colors.line },
  heroLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  heroLabelText: { color: colors.slatePale },
  heroMono: { fontSize: 11, lineHeight: 13.2 },
  heroTop: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' },
  heroActions: { flexDirection: 'row', gap: spacing.md },
  roundButton: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...roundShadow },
  heroBottom: { position: 'absolute', left: spacing.lg, bottom: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  mediaChip: { height: 26, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderRadius: radii.md, backgroundColor: colors.navyDeep },
  mediaChipText: { fontFamily: fontFamily.inter600, fontSize: 12, lineHeight: 14.4, color: colors.white },
  head: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.sm },
  financing: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 14, height: 36, borderRadius: 12, backgroundColor: colors.greenTint },
  financingText: { fontFamily: fontFamily.inter600, fontSize: 14, color: colors.greenText },
  kicker: { fontFamily: fontFamily.inter500, fontSize: 13, lineHeight: 15.6, color: colors.slate },
  title: { fontFamily: fontFamily.montserrat700, fontSize: 20, lineHeight: 26, color: colors.navy },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { flex: 1, fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 17, color: colors.slateLight },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  price: { fontFamily: fontFamily.montserrat800, fontSize: 26, lineHeight: 31.2, color: colors.navy, flexShrink: 1 },
  soldBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginHorizontal: spacing.xl, marginTop: spacing.xl, padding: spacing.lg, borderRadius: radii.xl, backgroundColor: colors.blueTint },
  soldText: { flex: 1, fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 19, color: colors.blue },
  divider: { height: 8, backgroundColor: colors.surface, marginTop: 18 },
  section: { paddingHorizontal: spacing.xl, paddingTop: 18 },
  sectionTitle: { fontFamily: fontFamily.montserrat700, fontSize: 16, lineHeight: 19.2, color: colors.navy, marginBottom: spacing.sm },
  specRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  specKey: { fontFamily: fontFamily.inter400, fontSize: 14, color: colors.slate },
  specValue: { flexShrink: 1, textAlign: 'right', fontFamily: fontFamily.inter600, fontSize: 14, color: colors.ink },
  descriptionSection: { paddingTop: spacing['2xl'] },
  descriptionTitle: { marginBottom: spacing.md },
  description: { fontFamily: fontFamily.inter400, fontSize: 14, lineHeight: 22.4, color: colors.inkSoft },
  more: { minHeight: sizes.minTouchTarget, alignSelf: 'flex-start', justifyContent: 'center' },
  moreText: { fontFamily: fontFamily.inter600, fontSize: 14, color: colors.blue },
  assurance: { margin: spacing.xl, padding: 14, borderRadius: radii.card, backgroundColor: colors.blueTint, flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  assuranceIcon: { width: 36, height: 36, borderRadius: radii.lg, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  assuranceText: { flex: 1, gap: 3 },
  assuranceTitle: { fontFamily: fontFamily.montserrat700, fontSize: 14, lineHeight: 18.2, color: colors.navy },
  assuranceBody: { fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 18.85, color: colors.inkMuted },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginHorizontal: spacing.xl, marginBottom: spacing.md, padding: spacing.lg, borderRadius: radii.xl, backgroundColor: colors.blueTint },
  noticeText: { flex: 1, fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 19, color: colors.blue },
  bottomBar: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.lineSoft, backgroundColor: colors.white },
  bottomBarStacked: { flexDirection: 'column' },
  slotStacked: { width: '100%' },
  callSlot: { width: 150 },
  messageSlot: { flex: 1, minWidth: 0 },
});
