import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError, userMessage, type ListingDetail } from '@/domain';
import { useFavoriteToggle } from '@/features/saved/useFavorites';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { formatPrice, statusLabels, statusTones, timeAgo } from '@/ui/format';
import { Icon, type IconName } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { usePop } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { callCompany } from './companyPhone';
import { DetailStateView } from './DetailStateView';
import { specRows, toListingView, type SpecRow } from './presentation';
import { listingContactHref, listingMediaHref } from './routes';
import { useListingQuery } from './useListingsQueries';

const HERO_HEIGHT = 330;

/**
 * İlan detayı (main tasarımı). Tek kaynak `listingId` rota parametresidir; gövde ID ile anahtarlanır, böylece parametre değişince önceki
 * ilanın sayfa/bildirim durumu taşınmaz. Boş/dizi ID doğrudan "bulunamadı"dır (servis çağrılmaz).
 */
export function ListingDetailScreen() {
  const { listingId } = useLocalSearchParams<{ listingId?: string | string[] }>();
  const id = typeof listingId === 'string' ? listingId.trim() : '';
  // Durum çubuğu sarmalayıcıda: yükleniyor/hata durumları da (açık zemin) koyu yazıyla görünür.
  return (
    <>
      <FocusStatusBar style="dark" />
      <ListingDetailBody key={id} listingId={id} />
    </>
  );
}

function useGoBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/'));
}

function ListingDetailBody({ listingId }: { listingId: string }) {
  const query = useListingQuery(listingId);
  const goBack = useGoBack();
  const back = { title: 'Geri dön', onPress: goBack };

  const notFound = (
    <DetailStateView
      icon="alert-circle"
      title="İlan bulunamadı"
      message="İlan yayından kaldırılmış olabilir."
      actions={[{ ...back, testID: 'listing-not-found-action' }]}
      testID="listing-not-found"
    />
  );

  if (listingId === '') return notFound;
  if (query.isPending) return <DetailStateView loading loadingLabel="İlan yükleniyor" testID="listing-loading" />;
  // Önbellek yalnızca GEÇİCİ hatalarda (offline/zaman aşımı/bilinmeyen) korunur: arka plan yenilemesi başarısız olsa da son bilinen detay
  // gösterilir. Varlık/erişim sonuçları (notFound, unauthenticated) eski veri olsa bile ilanı ve eylemlerini kaldırır.
  const error = query.isError ? query.error : null;
  const kind = error instanceof AppError ? error.kind : null;
  if (kind === 'notFound') return notFound;
  if (kind === 'unauthenticated') {
    return (
      <DetailStateView
        icon="alert-circle"
        title="Oturum gerekli"
        message={userMessage(error)}
        actions={[{ ...back, testID: 'listing-unauthenticated-action' }]}
        testID="listing-unauthenticated"
      />
    );
  }
  if (error && !query.data) {
    return (
      <DetailStateView
        icon="alert-circle"
        title={kind === 'offline' ? 'Bağlantı yok' : 'İlan yüklenemedi'}
        message={userMessage(error)}
        actions={[
          { title: 'Tekrar dene', onPress: () => void query.refetch(), testID: 'listing-error-action' },
          { ...back, variant: 'outline' },
        ]}
        testID="listing-error"
      />
    );
  }
  if (!query.data) return <DetailStateView loading loadingLabel="İlan yükleniyor" testID="listing-loading" />;
  if (query.data.status === 'withdrawn') {
    return (
      <DetailStateView
        icon="alert-circle"
        title="Bu ilan yayından kaldırıldı"
        message="İlan yayından kaldırıldığı için fotoğraflar ve iletişim kullanılamıyor."
        actions={[{ ...back, testID: 'listing-withdrawn-action' }]}
        testID="listing-withdrawn"
      />
    );
  }
  return <DetailContent detail={query.data} onBack={goBack} />;
}

/** Galeri sırası (main): önce fotoğraflar, en sonda video. Galeri ekranı da aynı sırayı kullanır; `index` bu sıradaki konumdur. */
function heroPhotos(detail: ListingDetail): { id: string; uri: string | null }[] {
  const photos = detail.media.filter((m) => m.kind === 'photo').map((m) => ({ id: m.id as string, uri: m.uri }));
  if (photos.length === 0 && detail.coverImageUri) return [{ id: 'cover', uri: detail.coverImageUri }];
  return photos;
}

/** Main'deki özellik sırası: Marka, Model, Model Yılı, Kilometre, Tip, ardından kategoriye özel alanlar. */
const HEAD_SPEC_KEYS = new Set(['brand', 'model', 'modelYear', 'odometer']);

function detailSpecRows(detail: ListingDetail): SpecRow[] {
  const rows = [...specRows(detail.specs)];
  const subtype = detail.subcategory;
  if (!subtype || rows.some((row) => row.value === subtype)) return rows;
  const after = rows.reduce((last, row, i) => (HEAD_SPEC_KEYS.has(row.key) ? i : last), -1);
  rows.splice(after + 1, 0, { key: 'subtype', label: 'Tip', value: subtype });
  return rows;
}

/** Bu yazı ölçeğinden büyükte alt eylem düğmeleri alt alta dizilir. */
const STACK_ACTIONS_MIN_FONT_SCALE = 1.3;

function DetailContent({ detail, onBack }: { detail: ListingDetail; onBack: () => void }) {
  const { width, fontScale } = useWindowDimensions();
  const stackActions = fontScale > STACK_ACTIONS_MIN_FONT_SCALE;
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const favorites = useFavoriteToggle();
  const isFavorite = favorites.isFavorite(detail.id);
  const heart = usePop();
  // Favori hatası (geri alma sonrası) eylem uyarısının yerine görünür; yeni eylem ikisini de temizler.
  const shownNotice = favorites.failure ?? notice;

  const view = toListingView(detail);
  const photos = heroPhotos(detail);
  const hasVideo = detail.media.some((m) => m.kind === 'video');
  // Galeride video, gerçek fotoğrafların hemen ardındadır (kapak yedeği galeride sayılmaz).
  const videoIndex = detail.media.filter((m) => m.kind === 'photo').length;
  const sold = detail.status === 'sold';
  const specs = detailSpecRows(detail);
  const location = [detail.location.city, detail.location.district].filter(Boolean).join(' / ');
  const price = formatPrice(view.price);

  const openGallery = (start = index) => router.push(listingMediaHref(detail.id, start));

  // Paylaşım yalnızca RN Share ile başlık/fiyat/ilan no metni hazırlar; web URL'si uydurulmaz.
  const share = () => {
    void Share.share({ message: `${detail.title} – ${price}\nİlan no: ${detail.listingNumber}\nNeşeli Kamyon Tır Pazarı` }).catch(() => undefined);
  };

  return (
    <View style={styles.container} testID="listing-screen">
      <ScrollView contentContainerStyle={styles.scroll} testID="listing-scroll">
        <View style={{ height: HERO_HEIGHT }} testID="listing-hero">
          {photos.length ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(m) => m.id}
              onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item, index: i }) => (
                <Pressable accessibilityRole="button" accessibilityLabel="Fotoğraf ve videoları aç" onPress={() => openGallery(i)}>
                  <ListingImage uri={item.uri} style={{ width, height: HERO_HEIGHT }} iconSize={64} icon={view.categoryIcon} showLabel />
                </Pressable>
              )}
            />
          ) : (
            <ListingImage uri={null} style={{ width, height: HERO_HEIGHT }} iconSize={64} icon={view.categoryIcon} showLabel />
          )}

          <View style={[styles.heroActions, { top: insets.top + Spacing.two }]}>
            <RoundButton icon="chevron-left" label="Geri" onPress={onBack} testID="listing-back" />
            <View style={styles.heroRight}>
              <RoundButton icon="share-2" label="Paylaş" onPress={share} testID="listing-share" />
              <RoundButton
                icon={isFavorite ? 'mci:heart' : 'heart'}
                iconColor={isFavorite ? Colors.danger : undefined}
                label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                selected={isFavorite}
                busy={favorites.isPending(detail.id)}
                iconStyle={heart.style}
                onPress={() => {
                  setNotice(null);
                  heart.pop(!isFavorite);
                  favorites.toggle(detail.id, detail);
                }}
                testID="listing-favorite"
              />
            </View>
          </View>

          {photos.length || hasVideo ? (
            <View style={styles.heroPills}>
              {photos.length ? (
                <Pressable style={styles.pill} onPress={() => openGallery()} testID="listing-photo-count">
                  <Icon name="camera" size={18} color="white" />
                  <Text variant="smallSemibold" style={styles.white}>
                    {index + 1} / {photos.length}
                  </Text>
                </Pressable>
              ) : null}
              {hasVideo ? (
                <Pressable style={styles.pill} onPress={() => openGallery(videoIndex)} testID="listing-video-chip">
                  <Icon name="play" size={18} color="white" />
                  <Text variant="smallSemibold" style={styles.white}>
                    Video
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.summary}>
          <Text variant="body" color="textSecondary" testID="listing-kicker">
            {[view.categoryName, view.subtype].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="title" accessibilityRole="header" testID="listing-title">
            {detail.title}
          </Text>
          <View style={styles.metaRow}>
            <Icon name="map-pin" size={16} color="textSecondary" />
            <Text variant="small" style={styles.flex} testID="listing-meta">
              {[location, detail.publishedAt ? timeAgo(detail.publishedAt) : null, `İlan no: ${detail.listingNumber}`].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text variant="priceLarge" style={styles.flex} testID="listing-price">
              {price}
            </Text>
            <View testID="listing-status">
              <Badge label={statusLabels[detail.status]} tone={statusTones[detail.status]} />
            </View>
          </View>
          {detail.financing ? (
            <View style={styles.financing} testID="listing-financing">
              <Icon name="credit-card" size={18} color="success" />
              <Text variant="smallSemibold" style={styles.financingText}>
                {detail.financing}
              </Text>
            </View>
          ) : null}
          {/* Main'de yok: satılmış ilanda iletişim kapalı olduğu için kısa açıklama (bizim iş kuralı). */}
          {sold ? (
            <View style={styles.soldInfo} testID="listing-sold-notice">
              <Icon name="info" size={18} color={INFO} />
              <Text variant="small" style={styles.infoText}>
                Bu ilan satıldı. Fotoğrafları inceleyebilirsiniz; yeni görüşme başlatılamaz.
              </Text>
            </View>
          ) : null}
        </View>

        {specs.length ? (
          <View style={styles.section}>
            <Text variant="heading" accessibilityRole="header">
              Özellikler
            </Text>
            {specs.map((row) => (
              <View key={row.key} style={styles.specRow} testID={`listing-spec-${row.key}`}>
                <Text variant="body" color="textSecondary">
                  {row.label}
                </Text>
                <Text variant="bodySemibold" style={styles.specValue}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {detail.description ? (
          <View style={styles.section}>
            <Text variant="heading" accessibilityRole="header">
              Açıklama
            </Text>
            <Text variant="body" testID="listing-description">
              {detail.description}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {shownNotice ? (
        <View
          style={[styles.notice, isAdmin && { paddingBottom: insets.bottom + Spacing.two }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="listing-notice">
          <Icon name="info" size={18} color={INFO} />
          <Text variant="small" style={styles.infoText}>
            {shownNotice}
          </Text>
        </View>
      ) : null}
      {/* Yönetici firmanın kendisidir: firmayı arama / firmaya mesaj başlatma eylemleri gösterilmez. */}
      {isAdmin ? null : (
        <View style={[styles.actions, stackActions && styles.actionsStacked, { paddingBottom: insets.bottom + Spacing.two }]}>
          <Button
            title="Hemen Ara"
            icon="phone"
            variant="outline"
            style={stackActions ? undefined : styles.action}
            disabled={sold}
            onPress={() => callCompany(setNotice)}
            testID="listing-call"
          />
          <Button
            title="Mesaj Gönder"
            icon="message-circle"
            style={stackActions ? undefined : styles.actionWide}
            disabled={sold}
            onPress={() => router.push(listingContactHref(detail.id))}
            testID="listing-contact"
          />
        </View>
      )}
    </View>
  );
}

function RoundButton({
  icon,
  iconColor,
  label,
  onPress,
  selected,
  busy = false,
  iconStyle,
  testID,
}: {
  icon: IconName;
  iconColor?: string;
  label: string;
  onPress: () => void;
  selected?: boolean;
  busy?: boolean;
  /** Simgenin animasyonlu stili (favori kalbinin "pop"u). */
  iconStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, busy }}
      disabled={busy}
      onPress={onPress}
      style={styles.round}
      testID={testID}>
      <Animated.View style={iconStyle}>
        <Icon name={icon} size={24} color={iconColor} />
      </Animated.View>
    </Pressable>
  );
}

/** `@/ui/Ui` Badge "info" tonunun yazı rengi. */
const INFO = '#1E4A7A';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.four },
  flex: { flex: 1 },
  white: { color: Colors.white },
  heroActions: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroRight: { flexDirection: 'row', gap: Spacing.three },
  round: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(10,33,63,0.15)',
  },
  heroPills: { position: 'absolute', left: Spacing.three, bottom: Spacing.three, flexDirection: 'row', gap: Spacing.two },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(10,33,63,0.92)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 40,
  },
  summary: {
    backgroundColor: Colors.surface,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  financing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  financingText: { color: Colors.success },
  soldInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  infoText: { flex: 1, color: INFO },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  section: { backgroundColor: Colors.surface, padding: Spacing.three, gap: Spacing.one, marginBottom: Spacing.two },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  specValue: { flexShrink: 1, textAlign: 'right' },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.surfaceHighlight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  actionsStacked: { flexDirection: 'column' },
  action: { flex: 1 },
  actionWide: { flex: 1.3 },
});
