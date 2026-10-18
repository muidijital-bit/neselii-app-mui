import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/theme';
import { useWallPhotos } from '@/features/listings/api';

const GAP = 10;
const TILE_RATIO = 1.25; // yükseklik / genişlik
// Her sütun farklı hız ve başlangıç noktasıyla akar (sn başına piksel, başlangıç oranı)
const COLUMN_MOTION = [
  { speed: 22, offset: 0.0 },
  { speed: 30, offset: 0.45 },
  { speed: 25, offset: 0.2 },
  { speed: 33, offset: 0.7 },
];

type Props = {
  height: number;
  style?: StyleProp<ViewStyle>;
  /** Duvarın alt kenarının karıştığı zemin rengi */
  fadeTo?: string;
  /** Fotoğrafların üzerine binen lacivert karartma (0-1); üstüne metin/logo geliyorsa artırılır */
  dim?: number;
  /** Sütun sayısı (3-4); kısa alanlarda 4 sütun daha "duvar" gibi görünür */
  columns?: 3 | 4;
};

/** Gerçek ilan fotoğraflarından yukarıdan aşağıya sonsuz akan duvar. */
export function PhotoWall({ height, style, fadeTo = Colors.navy, dim = 0.2, columns: COLUMNS = 3 }: Props) {
  const { width } = useWindowDimensions();
  const photos = useWallPhotos();
  const reduceMotion = useReducedMotion();

  const tileWidth = (width - GAP * (COLUMNS + 1)) / COLUMNS;
  const tileHeight = tileWidth * TILE_RATIO;

  // Fotoğrafları sütunlara dağıt; az fotoğraf varsa tekrar ederek doldur
  const list = photos.data ?? [];
  const perColumn = Math.max(4, Math.ceil(height / (tileHeight + GAP)) + 1);
  const columns = Array.from({ length: COLUMNS }, (_, c) =>
    Array.from({ length: perColumn }, (_, i) => (list.length ? list[(c + i * COLUMNS) % list.length] : null)),
  );

  return (
    <View style={[styles.wall, { height }, style]} pointerEvents="none">
      <View style={[styles.columns, { paddingHorizontal: GAP, gap: GAP }]}>
        {columns.map((items, c) => (
          <WallColumn
            key={c}
            items={items}
            tileWidth={tileWidth}
            tileHeight={tileHeight}
            speed={COLUMN_MOTION[c].speed}
            offset={COLUMN_MOTION[c].offset}
            animate={!reduceMotion && list.length > 0}
          />
        ))}
      </View>
      {/* Üstte logo, altta metin okunabilsin diye zemin rengine yumuşak geçiş */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(10,33,63,${dim})` }]} />
      <LinearGradient
        colors={[fadeTo, 'rgba(10,33,63,0.55)', 'rgba(10,33,63,0)']}
        locations={[0, 0.45, 1]}
        style={[styles.fade, styles.fadeTop]}
      />
      <LinearGradient
        colors={['rgba(10,33,63,0)', 'rgba(10,33,63,0.88)', fadeTo]}
        locations={[0, 0.55, 1]}
        style={[styles.fade, styles.fadeBottom]}
      />
    </View>
  );
}

function WallColumn({
  items,
  tileWidth,
  tileHeight,
  speed,
  offset,
  animate,
}: {
  items: (string | null)[];
  tileWidth: number;
  tileHeight: number;
  speed: number;
  offset: number;
  animate: boolean;
}) {
  // İçerik iki kez art arda dizilir; bir set yüksekliği kadar kayınca başa sarar (dikiş görünmez)
  const setHeight = items.length * (tileHeight + GAP);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    const cycleMs = (setHeight / speed) * 1000;
    progress.value = withRepeat(withTiming(1, { duration: cycleMs, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [animate, setHeight, speed, progress]);

  // Yukarıdan aşağı akış: -setHeight'tan 0'a iner; offset sütunları birbirinden kaydırır
  const animatedStyle = useAnimatedStyle(() => {
    const p = (progress.value + offset) % 1;
    return { transform: [{ translateY: -setHeight + p * setHeight }] };
  });

  const doubled = [...items, ...items];
  return (
    <View style={{ width: tileWidth, overflow: 'hidden' }}>
      <Animated.View style={[{ gap: GAP }, animatedStyle]}>
        {doubled.map((uri, i) =>
          uri ? (
            <Image
              key={i}
              source={uri}
              style={[styles.tile, { width: tileWidth, height: tileHeight }]}
              contentFit="cover"
              transition={400}
              cachePolicy="memory-disk"
            />
          ) : (
            <View key={i} style={[styles.tile, styles.placeholder, { width: tileWidth, height: tileHeight }]} />
          ),
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wall: { overflow: 'hidden', backgroundColor: Colors.navy },
  columns: { flexDirection: 'row', flex: 1 },
  tile: { borderRadius: Radius.lg, backgroundColor: Colors.navyRaised },
  placeholder: { borderWidth: 1, borderColor: Colors.navyLine },
  fade: { position: 'absolute', left: 0, right: 0 },
  fadeTop: { top: 0, height: '30%' },
  fadeBottom: { bottom: 0, height: '62%' },
});
