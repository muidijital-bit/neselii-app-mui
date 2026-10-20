import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Animated, type GestureResponderEvent, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, Share } from 'react-native';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { StripePlaceholder } from '@/components/StripePlaceholder';
import { Icon, type IconName } from '@/components/icons/Icon';
import { AppError, userMessage, type ListingDetail } from '@/domain';
import { colors, fontFamily, radii, spacing, textStyles } from '@/theme';

import { GalleryVideo } from './GalleryVideo';
import { useStageGestures, type TapZone } from './galleryGestures';
import { counterLabel, parseStartIndex, resolveSelected, toGalleryEntries, type GalleryEntry } from './galleryModel';
import { useListingQuery } from './useListingsQueries';

const STAGE_HEIGHT = 300;
const THUMB = 56;
const THUMB_GAP = 8;
const THUMB_PADDING = 16;

/**
 * Fotoğraf & video (08). Tek kaynak `listingId` rota parametresidir (isteğe bağlı `index`: 0 tabanlı başlangıç). Gövde ID ile anahtarlanır;
 * ilan erişilemez olunca (notFound / withdrawn / unauthenticated) galeri ve video bileşeni kaldırılır, böylece oynatma da durur.
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

  if (listingId === '') return <Message icon="search-x" title="İlan bulunamadı" message="Aradığınız ilan kaldırılmış olabilir ya da bağlantı hatalı." onBack={goBack} testID="media-not-found" />;
  if (query.isPending) return <Loading onBack={goBack} />;
  // Detay ekranıyla aynı kural: yalnızca geçici hatalarda önbellekteki ilan korunur; varlık/erişim sonuçları eski medyayı da kaldırır.
  const error = query.isError ? query.error : null;
  const kind = error instanceof AppError ? error.kind : null;
  if (kind === 'notFound') return <Message icon="search-x" title="İlan bulunamadı" message="Aradığınız ilan kaldırılmış olabilir ya da bağlantı hatalı." onBack={goBack} testID="media-not-found" />;
  if (kind === 'unauthenticated') return <Message icon="info" title="Oturum gerekli" message={userMessage(error)} onBack={goBack} testID="media-unauthenticated" />;
  if (error && !query.data) {
    return (
      <Message
        icon="info"
        title={kind === 'offline' ? 'Bağlantı yok' : 'Medya yüklenemedi'}
        message={userMessage(error)}
        onBack={goBack}
        onRetry={() => void query.refetch()}
        testID="media-error"
      />
    );
  }
  if (!query.data) return <Loading onBack={goBack} />;
  if (query.data.status === 'withdrawn') {
    return (
      <Message
        icon="eye-off"
        title="Bu ilan yayından kaldırıldı"
        message="İlan yayından kaldırıldığı için fotoğraf ve videolar görüntülenemiyor."
        onBack={goBack}
        testID="media-withdrawn"
      />
    );
  }
  return <Gallery detail={query.data} startParam={startParam} onBack={goBack} />;
}

function TopBar({ onClose, counter, onUnavailable }: { onClose: () => void; counter?: string; onUnavailable?: (what: 'download' | 'share') => void }) {
  return (
    <View style={styles.topBar}>
      <TopButton icon="x" label="Kapat" onPress={onClose} testID="media-close" />
      {counter ? (
        <Text style={styles.counter} accessibilityRole="header" testID="media-counter">
          {counter}
        </Text>
      ) : null}
      <View style={styles.topRight}>
        {onUnavailable ? (
          <>
            <TopButton icon="download" label="İndir" onPress={() => onUnavailable('download')} testID="media-download" />
            <TopButton icon="share-2" label="Paylaş" onPress={() => onUnavailable('share')} testID="media-share" />
          </>
        ) : null}
      </View>
    </View>
  );
}

function TopButton({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.topButton} testID={testID}>
      <Icon name={icon} size={icon === 'x' ? 24 : 21} color={colors.white} />
    </Pressable>
  );
}

function Loading({ onBack }: { onBack: () => void }) {
  return (
    <Screen background={colors.black} statusBar="light" testID="media-screen">
      <TopBar onClose={onBack} />
      <View style={styles.center} accessible accessibilityLabel="Medya yükleniyor" accessibilityState={{ busy: true }} testID="media-loading">
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    </Screen>
  );
}

function Message({
  icon,
  title,
  message,
  onBack,
  onRetry,
  testID,
}: {
  icon: IconName;
  title: string;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
  testID: string;
}) {
  return (
    <Screen background={colors.black} statusBar="light" testID="media-screen">
      <TopBar onClose={onBack} />
      <View style={styles.center} testID={testID}>
        <Icon name={icon} size={30} color={colors.slateFaint} />
        <Text style={styles.messageTitle} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.messageText}>{message}</Text>
        <View style={styles.messageActions}>
          {onRetry ? <Btn label="Tekrar dene" icon="refresh-cw" onPress={onRetry} testID={`${testID}-action`} /> : null}
          <Btn label="Geri dön" variant="onDark" icon="arrow-left" onPress={onBack} testID={`${testID}-back`} />
        </View>
      </View>
    </Screen>
  );
}

function Gallery({ detail, startParam, onBack }: { detail: ListingDetail; startParam: string | string[] | undefined; onBack: () => void }) {
  const entries = toGalleryEntries(detail.media);
  const [selectedId, setSelectedId] = useState<string | null>(() => detail.media[parseStartIndex(startParam, detail.media.length)]?.id ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const current = resolveSelected(entries, selectedId);

  const select = (entry: GalleryEntry) => {
    setSelectedId(entry.item.id);
    setNotice(null);
  };
  const step = (delta: 1 | -1) => {
    if (!current) return;
    const next = entries[current.index + delta];
    if (next) select(next);
  };
  // Paylaş: sistem paylaşım menüsü (medya adresi + ilan başlığı/numarası). İndirme henüz yok; kullanıcıya açıkça söylenir.
  const unavailable = (what: 'download' | 'share') => {
    if (what === 'download') {
      setNotice('İndirme henüz desteklenmiyor; hiçbir dosya kaydedilmedi.');
      return;
    }
    const uri = current?.item.uri ?? undefined;
    const message = `${detail.title} · İlan no: ${detail.listingNumber}`;
    Share.share(uri ? { message: `${message}\n${uri}`, url: uri } : { message }).catch(() => setNotice('Paylaşım açılamadı.'));
  };

  if (!current) {
    return (
      <Screen background={colors.black} statusBar="light" testID="media-screen">
        <TopBar onClose={onBack} />
        <View style={styles.center} testID="media-empty">
          <Icon name="image" size={30} color={colors.slateFaint} />
          <Text style={styles.messageTitle} accessibilityRole="header">
            Fotoğraf veya video yok
          </Text>
          <Text style={styles.messageText}>Bu ilan için henüz fotoğraf ya da video eklenmemiş.</Text>
          <View style={styles.messageActions}>
            <Btn label="Geri dön" variant="onDark" icon="arrow-left" onPress={onBack} testID="media-empty-back" />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.black} statusBar="light" edges={['top', 'bottom', 'left', 'right']} testID="media-screen">
      <TopBar onClose={onBack} counter={counterLabel(current, entries)} onUnavailable={unavailable} />
      <View style={styles.body}>
        <Stage key={current.item.id} entry={current} onBack={onBack} onPrev={() => step(-1)} onNext={() => step(1)} canPrev={current.index > 0} canNext={current.index < entries.length - 1} />
        <View style={styles.captionBox}>
          <Text style={styles.caption} numberOfLines={2} testID="media-title">
            {detail.title}
          </Text>
          <Text style={styles.hint}>{current.item.kind === 'photo' ? 'Kaydırarak gezinin · çift dokunarak yakınlaştırın' : 'Kaydırarak gezinin'}</Text>
          {notice ? (
            <Text style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="media-notice">
              {notice}
            </Text>
          ) : null}
        </View>
      </View>
      <Thumbs entries={entries} currentId={current.item.id} onSelect={select} />
    </Screen>
  );
}

/** Seçili medya sahnesi; `key` = medya kimliği olduğundan seçim değişince video bileşeni kaldırılır (oynatma durur). */
function Stage({
  entry,
  onBack,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: {
  entry: GalleryEntry;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const { width } = useWindowDimensions();
  const [attempt, setAttempt] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const retry = () => {
    setPhotoFailed(false);
    setAttempt((n) => n + 1);
  };
  const { item } = entry;
  const placeholder = (
    <>
      <StripePlaceholder width={width} height={STAGE_HEIGHT} stripe={8} colorA={colors.ink} colorB={colors.darkStripeA} />
      {item.kind === 'photo' ? (
        <View style={styles.placeholderLabel} pointerEvents="none">
          <Text style={styles.mono}>{`araç fotoğrafı · ${entry.index + 1}`}</Text>
        </View>
      ) : null}
    </>
  );

  const photo = item.kind === 'photo';
  const gestures = useStageGestures({ size: { width, height: STAGE_HEIGHT }, canPrev, canNext, onPrev, onNext, zoomable: photo });
  const zoomLayer = { transform: [{ translateX: gestures.tx }, { translateY: gestures.ty }, { scale: gestures.scale }] };
  const photoReady = photo && !photoFailed;

  let content: React.ReactNode;
  if (item.kind === 'video') {
    content = <GalleryVideo key={attempt} uri={item.uri} onRetry={retry} onBack={onBack} stage={placeholder} testID="media-video" />;
  } else if (item.uri === null) {
    content = placeholder;
  } else if (photoFailed) {
    content = (
      <>
        {placeholder}
        <View style={styles.photoError} testID="media-photo-error">
          <Text style={styles.errorTitle}>Fotoğraf yüklenemedi</Text>
          <View style={styles.photoErrorActions}>
            <Btn label="Tekrar dene" icon="refresh-cw" onPress={retry} testID="media-photo-retry" />
          </View>
        </View>
      </>
    );
  } else {
    content = (
      <>
        {placeholder}
        <Image
          key={attempt}
          source={{ uri: item.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          accessibilityIgnoresInvertColors
          onError={() => setPhotoFailed(true)}
          testID="media-photo"
        />
      </>
    );
  }

  const zone = (name: TapZone, offset: number) => (event: GestureResponderEvent) =>
    gestures.handleTap(name, { x: offset + (event.nativeEvent?.locationX ?? 0), y: event.nativeEvent?.locationY ?? STAGE_HEIGHT / 2 });

  return (
    <View style={[styles.stage, { height: STAGE_HEIGHT }]} testID="media-stage" {...gestures.panHandlers}>
      <Animated.View
        style={[StyleSheet.absoluteFill, zoomLayer]}
        accessibilityValue={photo ? { text: gestures.zoomed ? 'Yakınlaştırıldı' : 'Normal boyut' } : undefined}
        testID="media-surface">
        {content}
      </Animated.View>
      {photoReady ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Önceki" onPress={zone('left', 0)} style={[styles.zone, styles.zoneLeft]} testID="media-prev" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={gestures.zoomed ? 'Uzaklaştır' : 'Yakınlaştır'}
            accessibilityHint="Çift dokunarak yakınlaştırır veya geri alır"
            accessibilityActions={[{ name: 'activate', label: gestures.zoomed ? 'Uzaklaştır' : 'Yakınlaştır' }]}
            onAccessibilityAction={() => gestures.toggleZoom()}
            onPress={zone('center', width * 0.3)}
            style={[styles.zone, styles.zoneCenter]}
            testID="media-zoom"
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Sonraki" onPress={zone('right', width * 0.7)} style={[styles.zone, styles.zoneRight]} testID="media-next" />
        </View>
      ) : null}
    </View>
  );
}

function Thumbs({ entries, currentId, onSelect }: { entries: readonly GalleryEntry[]; currentId: string; onSelect: (entry: GalleryEntry) => void }) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const currentIndex = entries.findIndex((e) => e.item.id === currentId);
  const { width } = useWindowDimensions();

  useEffect(() => {
    const x = THUMB_PADDING + currentIndex * (THUMB + THUMB_GAP) - (width - THUMB) / 2;
    scroll.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [currentIndex, width]);

  return (
    <ScrollView ref={scroll} horizontal removeClippedSubviews={false} showsHorizontalScrollIndicator={false} style={styles.thumbs} contentContainerStyle={styles.thumbsContent} testID="media-thumbs">
      {entries.map((entry) => {
        const selected = entry.item.id === currentId;
        const video = entry.item.kind === 'video';
        return (
          <Pressable
            key={entry.item.id}
            accessibilityRole="button"
            accessibilityLabel={video ? 'Video' : `Fotoğraf ${entry.photoNumber}`}
            accessibilityState={{ selected }}
            onPress={() => onSelect(entry)}
            style={[styles.thumb, selected && styles.thumbSelected]}
            testID={`media-thumb-${entry.index}`}>
            <StripePlaceholder width={THUMB} height={THUMB} stripe={5} colorA={colors.darkStripeA} colorB={colors.darkStripeB} style={StyleSheet.absoluteFill} />
            {entry.item.thumbnailUri ? <Image source={{ uri: entry.item.thumbnailUri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
            {selected ? null : <View style={styles.thumbDim} pointerEvents="none" />}
            {video ? (
              <>
                <Icon name="play" size={16} color={colors.greenBright} />
                <Text style={styles.thumbVideo}>Video</Text>
              </>
            ) : (
              <Text style={styles.thumbNumber}>{entry.photoNumber}</Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  topButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topRight: { minWidth: 88, flexDirection: 'row', justifyContent: 'flex-end' },
  counter: { fontFamily: fontFamily.montserrat600, fontSize: 16, lineHeight: 16, color: colors.white },
  body: { flex: 1, minHeight: 0, justifyContent: 'center', gap: 18 },
  stage: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  placeholderLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  mono: { ...textStyles.mono, fontSize: 11, lineHeight: 13.2, color: colors.slatePale },
  zone: { position: 'absolute', top: 0, bottom: 0 },
  zoneLeft: { left: 0, width: '30%' },
  zoneCenter: { left: '30%', width: '40%' },
  zoneRight: { right: 0, width: '30%' },
  captionBox: { alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  caption: { fontFamily: fontFamily.montserrat600, fontSize: 14, lineHeight: 18.2, color: colors.lineSoft, textAlign: 'center' },
  hint: { fontFamily: fontFamily.inter400, fontSize: 12, color: colors.slateFaint },
  notice: { fontFamily: fontFamily.inter500, fontSize: 12, lineHeight: 17, color: colors.bluePale, textAlign: 'center' },
  thumbs: { flexGrow: 0 },
  thumbsContent: { gap: THUMB_GAP, paddingTop: spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: THUMB_PADDING },
  thumb: { width: THUMB, height: THUMB, borderRadius: radii.md, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 2 },
  thumbSelected: { borderColor: colors.white },
  // Tasarımdaki `opacity: .7` yerine örtü: Android'de seçim değişince opaklığı değişen küçük resimler çizilmiyordu.
  thumbDim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
  thumbNumber: { fontFamily: fontFamily.inter600, fontSize: 11, lineHeight: 11, color: colors.line },
  thumbVideo: { fontFamily: fontFamily.inter600, fontSize: 9, lineHeight: 9, color: colors.line },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing['3xl'] },
  messageTitle: { fontFamily: fontFamily.montserrat700, fontSize: 16, lineHeight: 20, color: colors.white, textAlign: 'center' },
  messageText: { fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 19, color: colors.slateFaint, textAlign: 'center' },
  messageActions: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.md },
  photoError: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: 'rgba(17,22,31,0.86)' },
  photoErrorActions: { alignSelf: 'stretch' },
  errorTitle: { fontFamily: fontFamily.montserrat700, fontSize: 16, lineHeight: 20, color: colors.white },
});
