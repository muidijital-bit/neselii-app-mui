import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

/** İsteğe bağlı tanıtım videosu (`.env.local` → `EXPO_PUBLIC_HOME_HERO_VIDEO_URL`). Tanımlıysa kolaj yerine sessiz döngüde oynar. */
const HERO_VIDEO_URL = process.env.EXPO_PUBLIC_HOME_HERO_VIDEO_URL?.trim() ?? '';

/** Yan yana sütun sayısı ve her sütundaki görsel sayısı (döngü için sütun içeriği iki kez çizilir). */
const COLUMNS = 4;
const TILES_PER_COLUMN = 5;
const GAP = 10;
/** Görsel oranı (yükseklik / genişlik): dikey sütunlarda biraz uzun kutular. */
const TILE_RATIO = 1.18;
/** Sütun başına tam tur süresi; her sütun biraz farklı hızda akar, kolaj canlı ama sakin görünür. */
const COLUMN_LOOP_MS = [46_000, 38_000, 52_000, 42_000] as const;
/** Sütunlar aynı hizadan başlamasın diye başlangıç kayması (görsel yüksekliğinin katı). */
const COLUMN_OFFSET = [0, 0.55, 0.25, 0.8] as const;

type Props = {
  /** Kolajda kullanılacak ilan kapakları (gerçek ilanlar). Boşsa yalnız lacivert zemin kalır. */
  imageUris: readonly string[];
  /** Kolajın başladığı yükseklik: üstündeki alan (durum çubuğu + logo satırı) düz koyu lacivert kalır. */
  top?: number;
};

/** Görsellerin lacivert zemine karışarak kaybolduğu geçiş yükseklikleri (üst ve alt). */
const FADE_TOP = 90;
const FADE_BOTTOM = 70;

/**
 * Ana sayfa üst alanının hareketli arka planı (2. aşama tasarımı: kamyon görselleri üzerinde koyu örtü). Video verilmediğinde ilan
 * kapakları dört sütunlu bir kolajda yukarıdan aşağıya doğru yavaşça kayar; her sütun farklı sırayla ve hızla akar. "Hareketi azalt"
 * açıksa kolaj sabit durur. Yalnızca dekoratiftir: erişilebilirlik ağacında yer almaz.
 */
export function HeroBackdrop({ imageUris, top = 0 }: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.media, { top }]}>
        {HERO_VIDEO_URL ? <HeroVideo uri={HERO_VIDEO_URL} /> : <Collage imageUris={imageUris} />}
        <View style={styles.scrim} />
        {/* Üstte düz lacivertten, altta lacivert zemine doğru yumuşak geçiş: görseller kenarlarda solarak kaybolur. */}
        <Fade edge="top" height={FADE_TOP} />
        <Fade edge="bottom" height={FADE_BOTTOM} />
      </View>
    </View>
  );
}

function Fade({ edge, height }: { edge: 'top' | 'bottom'; height: number }) {
  const id = `hero-fade-${edge}`;
  return (
    <Svg style={[styles.fade, edge === 'top' ? { top: 0 } : { bottom: 0 }, { height }]} preserveAspectRatio="none" viewBox="0 0 1 1">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.navy} stopOpacity={edge === 'top' ? 1 : 0} />
          <Stop offset="1" stopColor={colors.navy} stopOpacity={edge === 'top' ? 0 : 1} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="1" height="1" fill={`url(#${id})`} />
    </Svg>
  );
}

function HeroVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />;
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => alive && setReduce(value), () => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Her sütun için farklı bir sıralama: liste sütuna göre döndürülür, tek sütunlarda ters çevrilir ve atlamalı okunur. Böylece komşu
 * sütunlarda aynı görsel yan yana gelmez ve kolaj karışık görünür (rastgele değil: her açılışta aynı, titreme yok).
 */
function columnOrder(uris: readonly string[], column: number): string[] {
  const n = uris.length;
  const step = n > 2 && n % 2 === 1 ? 2 : 1;
  const start = Math.floor((column * n) / COLUMNS);
  const picked: string[] = [];
  for (let i = 0; i < TILES_PER_COLUMN; i += 1) picked.push(uris[(start + i * step) % n]);
  return column % 2 === 1 ? picked.reverse() : picked;
}

function Collage({ imageUris }: { imageUris: readonly string[] }) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const tileWidth = width > 0 ? (width - GAP * (COLUMNS + 1)) / COLUMNS : 0;

  return (
    <View style={styles.collage} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {imageUris.length > 0 && tileWidth > 0
        ? Array.from({ length: COLUMNS }, (_, column) => (
            <MarqueeColumn
              key={column}
              uris={columnOrder(imageUris, column)}
              tileWidth={tileWidth}
              durationMs={COLUMN_LOOP_MS[column]}
              offset={COLUMN_OFFSET[column]}
              paused={reduceMotion}
            />
          ))
        : null}
    </View>
  );
}

type ColumnProps = { uris: readonly string[]; tileWidth: number; durationMs: number; offset: number; paused: boolean };

/** Yukarıdan aşağıya akan tek sütun: içerik iki kez alt alta çizilir, bir tur sütun yüksekliği kadar kayınca kesintisiz döner. */
function MarqueeColumn({ uris, tileWidth, durationMs, offset, paused }: ColumnProps) {
  const [progress] = useState(() => new Animated.Value(0));
  const tileHeight = Math.round(tileWidth * TILE_RATIO);
  const columnHeight = uris.length * (tileHeight + GAP);
  const shift = offset * tileHeight;

  useEffect(() => {
    if (paused) {
      progress.stopAnimation();
      return undefined;
    }
    const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: durationMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [paused, progress, durationMs]);

  // Aşağı doğru akış: içerik -sütunYüksekliği'nden 0'a iner; ikinci kopya ilkinin üstünden ekrana girer.
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-columnHeight - shift, -shift] });

  return (
    <Animated.View style={[styles.column, { width: tileWidth, transform: [{ translateY }] }]}>
      {[...uris, ...uris].map((uri, index) => (
        <Image key={`${index}-${uri}`} source={{ uri }} style={[styles.tile, { width: tileWidth, height: tileHeight }]} contentFit="cover" transition={300} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  collage: { ...StyleSheet.absoluteFill, flexDirection: 'row', gap: GAP, paddingHorizontal: GAP, overflow: 'hidden' },
  column: { gap: GAP },
  tile: { borderRadius: 16, backgroundColor: colors.navyRaised },
  media: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  // Tasarımdaki koyu lacivert örtü: görseller soluk ama seçilir, üstündeki metin okunur kalır.
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10, 34, 64, 0.72)' },
  fade: { position: 'absolute', left: 0, right: 0 },
});
