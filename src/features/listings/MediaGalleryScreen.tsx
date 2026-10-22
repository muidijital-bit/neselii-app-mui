import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError, userMessage, type ListingDetail, type MediaItem } from '@/domain';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { DetailStateView } from './DetailStateView';
import { GalleryVideo } from './GalleryVideo';
import { parseStartIndex } from './galleryModel';
import { useListingQuery } from './useListingsQueries';

const THUMB = 84;

/**
 * Fotoğraf & video (main tasarımı). Tek kaynak `listingId` rota parametresidir (isteğe bağlı `index`: galeri sırasında 0 tabanlı başlangıç;
 * galeri sırası önce fotoğraflar, en sonda video). Gövde ID ile anahtarlanır; ilan erişilemez olunca (notFound / withdrawn /
 * unauthenticated) galeri ve video bileşeni kaldırılır, böylece oynatma da durur.
 */
export function MediaGalleryScreen() {
  const { listingId, index } = useLocalSearchParams<{ listingId?: string | string[]; index?: string | string[] }>();
  const id = typeof listingId === 'string' ? listingId.trim() : '';
  return <MediaGalleryBody key={id} listingId={id} startParam={index} />;
}

function useGoBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/'));
}

function MediaGalleryBody({ listingId, startParam }: { listingId: string; startParam: string | string[] | undefined }) {
  const query = useListingQuery(listingId);
  const goBack = useGoBack();
  const back = (testID: string) => ({ title: 'Geri dön', onPress: goBack, testID });

  const notFound = (
    <DetailStateView
      icon="alert-circle"
      title="İlan bulunamadı"
      message="İlan yayından kaldırılmış olabilir."
      actions={[back('media-not-found-back')]}
      testID="media-not-found"
    />
  );

  if (listingId === '') return notFound;
  if (query.isPending) return <DetailStateView loading loadingLabel="Medya yükleniyor" testID="media-loading" />;
  // Detay ekranıyla aynı kural: yalnızca geçici hatalarda önbellekteki ilan korunur; varlık/erişim sonuçları eski medyayı da kaldırır.
  const error = query.isError ? query.error : null;
  const kind = error instanceof AppError ? error.kind : null;
  if (kind === 'notFound') return notFound;
  if (kind === 'unauthenticated') {
    return <DetailStateView icon="alert-circle" title="Oturum gerekli" message={userMessage(error)} actions={[back('media-unauthenticated-back')]} testID="media-unauthenticated" />;
  }
  if (error && !query.data) {
    return (
      <DetailStateView
        icon="alert-circle"
        title={kind === 'offline' ? 'Bağlantı yok' : 'Medya yüklenemedi'}
        message={userMessage(error)}
        actions={[{ title: 'Tekrar dene', onPress: () => void query.refetch(), testID: 'media-error-action' }, { ...back('media-error-back'), variant: 'outline' }]}
        testID="media-error"
      />
    );
  }
  if (!query.data) return <DetailStateView loading loadingLabel="Medya yükleniyor" testID="media-loading" />;
  if (query.data.status === 'withdrawn') {
    return (
      <DetailStateView
        icon="alert-circle"
        title="Bu ilan yayından kaldırıldı"
        message="İlan yayından kaldırıldığı için fotoğraf ve videolar görüntülenemiyor."
        actions={[back('media-withdrawn-back')]}
        testID="media-withdrawn"
      />
    );
  }
  return <Gallery detail={query.data} startParam={startParam} onBack={goBack} />;
}

function Gallery({ detail, startParam, onBack }: { detail: ListingDetail; startParam: string | string[] | undefined; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<FlatList<MediaItem>>(null);
  const thumbs = useRef<FlatList<MediaItem>>(null);

  // Fotoğraflar önce, video en sonda
  const media = [...detail.media.filter((m) => m.kind === 'photo'), ...detail.media.filter((m) => m.kind === 'video')];
  const photoCount = media.filter((m) => m.kind === 'photo').length;
  const [current, setCurrent] = useState(() => parseStartIndex(startParam, media.length));
  const [notice, setNotice] = useState<string | null>(null);
  const active = media[current];

  const goTo = (i: number) => {
    setCurrent(i);
    setNotice(null);
    pager.current?.scrollToIndex({ index: i, animated: true });
  };

  const onPageChange = (i: number) => {
    if (i === current) return;
    setCurrent(i);
    setNotice(null);
    thumbs.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0.5 });
  };

  // Paylaş: sistem paylaşım menüsü (ilan başlığı + seçili medya adresi).
  const share = () => {
    if (!active) return;
    Share.share({ message: active.uri ? `${detail.title}\n${active.uri}` : detail.title }).catch(() => setNotice('Paylaşım açılamadı.'));
  };

  return (
    <View style={styles.container} testID="media-screen">
      <FocusStatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Kapat" onPress={onBack} testID="media-close">
          <Icon name="x" size={30} color="white" />
        </Pressable>
        <Text variant="heading" style={styles.white} accessibilityRole="header" testID="media-counter">
          {active?.kind === 'video' ? 'Video' : `${Math.min(current + 1, photoCount)} / ${photoCount}`}
        </Text>
        <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Paylaş" onPress={share} testID="media-share">
          <Icon name="share-2" size={26} color="white" />
        </Pressable>
      </View>

      <FlatList
        ref={pager}
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={media.length ? Math.min(current, media.length - 1) : undefined}
        getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(m) => m.id}
        onMomentumScrollEnd={(e) => onPageChange(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.pager}
        testID="media-stage"
        renderItem={({ item, index: i }) => (
          <View style={[styles.page, { width }]}>
            {item.kind === 'video' ? <VideoPage uri={item.uri} active={i === current} /> : <PhotoPage uri={item.uri} />}
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.page, { width }]} testID="media-empty">
            <Icon name="camera-off" size={48} color={Colors.navyBorder} />
            <Text variant="body" style={styles.muted}>
              Bu ilana henüz fotoğraf eklenmedi.
            </Text>
          </View>
        }
      />

      <View style={styles.caption}>
        <Text variant="subheading" align="center" style={styles.white} testID="media-title">
          {detail.title}
        </Text>
        <Text variant="small" align="center" style={styles.muted}>
          {active?.kind === 'video' ? (media.length > 1 ? 'Kaydırarak gezinin' : '') : media.length > 1 ? 'Kaydırarak gezinin · iki parmakla yakınlaştırın' : 'İki parmakla yakınlaştırın'}
        </Text>
        {notice ? (
          <Text variant="small" align="center" style={styles.muted} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="media-notice">
            {notice}
          </Text>
        ) : null}
      </View>

      <FlatList
        ref={thumbs}
        data={media}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(m) => `thumb-${m.id}`}
        getItemLayout={(_d, i) => ({ length: THUMB + Spacing.two, offset: (THUMB + Spacing.two) * i, index: i })}
        contentContainerStyle={[styles.thumbs, { paddingBottom: insets.bottom + Spacing.three }]}
        style={styles.thumbList}
        testID="media-thumbs"
        renderItem={({ item, index: i }) => {
          const thumbUri = item.thumbnailUri ?? item.uri;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.kind === 'video' ? 'Video' : `Fotoğraf ${i + 1}`}
              accessibilityState={{ selected: i === current }}
              onPress={() => goTo(i)}
              style={[styles.thumb, i === current && styles.thumbActive]}
              testID={`media-thumb-${i}`}>
              {item.kind === 'video' ? (
                <View style={styles.videoThumb}>
                  <Icon name="play" size={24} color="green" />
                  <Text variant="caption" style={styles.white}>
                    Video
                  </Text>
                </View>
              ) : thumbUri ? (
                <Image source={thumbUri} style={styles.thumbImage} contentFit="cover" />
              ) : (
                <View style={styles.videoThumb}>
                  <Icon name="camera" size={22} color={Colors.navyBorder} />
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

/** Fotoğraf sayfası: iki parmakla yakınlaştırma (main: `ScrollView` zoom); yüklenemezse yeniden deneme. */
function PhotoPage({ uri }: { uri: string | null }) {
  const { width } = useWindowDimensions();
  const size = { width, height: width * 0.78 };
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  if (!uri) return <ListingImage uri={null} dark iconSize={48} style={size} />;
  if (failed) {
    return (
      <View style={[styles.failed, size]} testID="media-photo-error">
        <Icon name="camera-off" size={48} color={Colors.navyBorder} />
        <Text variant="body" style={styles.muted}>
          Fotoğraf yüklenemedi.
        </Text>
        <Button
          title="Tekrar dene"
          icon="refresh-cw"
          variant="outlineDark"
          onPress={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
          testID="media-photo-retry"
        />
      </View>
    );
  }
  return (
    <ScrollView maximumZoomScale={3} minimumZoomScale={1} centerContent showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
      <Image key={attempt} source={uri} style={size} contentFit="contain" accessibilityIgnoresInvertColors onError={() => setFailed(true)} testID="media-photo" />
    </ScrollView>
  );
}

/** Video sayfası: hata sonrası "Tekrar dene" oynatıcıyı `key` ile yeniden oluşturur. */
function VideoPage({ uri, active }: { uri: string | null; active: boolean }) {
  const [attempt, setAttempt] = useState(0);
  return <GalleryVideo key={attempt} uri={uri} active={active} onRetry={() => setAttempt((n) => n + 1)} testID="media-video" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  white: { color: Colors.white },
  muted: { color: '#9AA4B2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  pager: { flexGrow: 0, marginTop: 'auto' },
  page: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, minHeight: 280 },
  failed: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  caption: { gap: Spacing.one, paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  thumbList: { flexGrow: 0, marginTop: 'auto' },
  thumbs: { gap: Spacing.two, paddingHorizontal: Spacing.four },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#161D29',
  },
  thumbActive: { borderColor: Colors.white },
  thumbImage: { width: '100%', height: '100%' },
  videoThumb: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
