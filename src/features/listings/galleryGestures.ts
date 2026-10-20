import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';

export const ZOOM_SCALE = 2.5;
/** Yatay kaydırmanın medya değiştirmesi için gereken en az yol (px) ve hızlı fırlatmada en az yol/hız. */
export const SWIPE_DISTANCE = 60;
export const SWIPE_FLING_DISTANCE = 24;
export const SWIPE_FLING_VELOCITY = 0.5;
/** Hareket bu eşiği aşınca dokunma kaydırmaya dönüşür (px). */
export const MOVE_SLOP = 10;
/** Çift dokunma penceresi (ms). Tek dokunma kenar gezintisi bu süre bekler. */
export const DOUBLE_TAP_MS = 400;

export type SwipeResult = 'next' | 'prev' | null;

/** Yakınlaştırılmamışken bırakma: sola kaydırma → sonraki, sağa → önceki. */
export function swipeResult(dx: number, vx: number): SwipeResult {
  const fling = Math.abs(vx) >= SWIPE_FLING_VELOCITY && Math.abs(dx) >= SWIPE_FLING_DISTANCE;
  if (Math.abs(dx) < SWIPE_DISTANCE && !fling) return null;
  return dx < 0 ? 'next' : 'prev';
}

/** Kaydırma hareketi mi? Yakınlaştırılmamışken yalnız baskın yatay hareket; yakınlaştırılmışken her yöndeki sürükleme. */
export function shouldCaptureMove(dx: number, dy: number, zoomed: boolean): boolean {
  if (zoomed) return Math.abs(dx) > MOVE_SLOP / 2 || Math.abs(dy) > MOVE_SLOP / 2;
  return Math.abs(dx) > MOVE_SLOP && Math.abs(dx) > Math.abs(dy);
}

/** Yakınlaştırılmış fotoğrafın çerçeve dışına taşmaması için kaydırma sınırı (merkezden en fazla yarı fazlalık). */
export function clampPan(value: number, size: number, scale: number): number {
  const limit = ((scale - 1) * size) / 2;
  return Math.max(-limit, Math.min(limit, value));
}

/** Dokunulan noktayı yerinde tutan öteleme (dönüşüm merkezi sahne ortası), sınırlandırılmış. */
export function zoomTranslate(tap: { x: number; y: number }, size: { width: number; height: number }, scale: number) {
  const tx = (tap.x - size.width / 2) * (1 - scale);
  const ty = (tap.y - size.height / 2) * (1 - scale);
  return { x: clampPan(tx, size.width, scale), y: clampPan(ty, size.height, scale) };
}

export type TapZone = 'left' | 'center' | 'right';

type Options = {
  size: { width: number; height: number };
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Fotoğrafta çift dokunmayla yakınlaştırma; video yakınlaşmaz. */
  zoomable: boolean;
};

/**
 * Galeri sahnesi hareketleri (yalnız RN: PanResponder + Animated, yeni native paket yok):
 * yatay kaydırma önceki/sonraki medyaya geçer; fotoğrafta çift dokunma yakınlaştırır/geri alır; yakınlaştırılmışken sürükleme
 * sınırlı kaydırır ve ASLA medya değiştirmez. Kısa dokunmalar çocuk `Pressable`'lara gider; hareket eşiği aşılınca yakalanır.
 */
export function useStageGestures({ size, canPrev, canNext, onPrev, onNext, zoomable }: Options) {
  const [zoomed, setZoomed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const base = useRef({ x: 0, y: 0 });
  const zoomedRef = useRef(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);
  // PanResponder bir kez kurulur; güncel değerler ref üzerinden okunur.
  const live = useRef({ size, canPrev, canNext, onPrev, onNext, zoomable });
  live.current = { size, canPrev, canNext, onPrev, onNext, zoomable };

  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    [],
  );

  const animateTo = (toScale: number, to: { x: number; y: number }) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: toScale, duration: 180, useNativeDriver: false }),
      Animated.timing(tx, { toValue: to.x, duration: 180, useNativeDriver: false }),
      Animated.timing(ty, { toValue: to.y, duration: 180, useNativeDriver: false }),
    ]).start();
  };

  const setZoom = (next: boolean, tap?: { x: number; y: number }) => {
    zoomedRef.current = next;
    setZoomed(next);
    const to = next && tap ? zoomTranslate(tap, live.current.size, ZOOM_SCALE) : { x: 0, y: 0 };
    base.current = to;
    animateTo(next ? ZOOM_SCALE : 1, to);
  };

  const springBack = () => Animated.spring(tx, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_e: GestureResponderEvent, g: PanResponderGestureState) =>
          shouldCaptureMove(g.dx, g.dy, zoomedRef.current),
        onPanResponderTerminationRequest: () => false,
        // Hareket devralınınca bekleyen tek dokunma (kenar gezintisi) ve çift dokunma geçmişi iptal: parmak sahnedeyken medya değişmesin.
        onPanResponderGrant: () => {
          if (tapTimer.current) clearTimeout(tapTimer.current);
          tapTimer.current = null;
          lastTap.current = 0;
        },
        onPanResponderMove: (_e, g) => {
          const { size: s, canPrev: cp, canNext: cn } = live.current;
          if (zoomedRef.current) {
            tx.setValue(clampPan(base.current.x + g.dx, s.width, ZOOM_SCALE));
            ty.setValue(clampPan(base.current.y + g.dy, s.height, ZOOM_SCALE));
            return;
          }
          // Sınırda (ilk/son) direnç: parmağı yalnızca biraz izler.
          const blocked = (g.dx > 0 && !cp) || (g.dx < 0 && !cn);
          tx.setValue(blocked ? g.dx * 0.25 : g.dx);
        },
        onPanResponderRelease: (_e, g) => {
          if (zoomedRef.current) {
            const { size: s } = live.current;
            base.current = { x: clampPan(base.current.x + g.dx, s.width, ZOOM_SCALE), y: clampPan(base.current.y + g.dy, s.height, ZOOM_SCALE) };
            return;
          }
          const result = swipeResult(g.dx, g.vx);
          const { canPrev: cp, canNext: cn, onPrev: prev, onNext: next } = live.current;
          if (result === 'next' && cn) next();
          else if (result === 'prev' && cp) prev();
          else springBack();
        },
        onPanResponderTerminate: () => {
          if (!zoomedRef.current) springBack();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * Fotoğraf sahnesi dokunması (bölge + sahne içi konum). İkinci dokunma pencere içindeyse yakınlaştırmayı aç/kapat; aksi halde
   * yakınlaştırılmamış kenar dokunması pencere dolunca önceki/sonraki medyaya geçer.
   */
  const handleTap = (zone: TapZone, point: { x: number; y: number }) => {
    if (!live.current.zoomable) return;
    const now = Date.now();
    if (tapTimer.current && now - lastTap.current <= DOUBLE_TAP_MS) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      setZoom(!zoomedRef.current, point);
      return;
    }
    lastTap.current = now;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      if (zoomedRef.current || zone === 'center') return;
      const { canPrev: cp, canNext: cn, onPrev: prev, onNext: next } = live.current;
      if (zone === 'left' && cp) prev();
      if (zone === 'right' && cn) next();
    }, DOUBLE_TAP_MS);
  };

  return { zoomed, scale, tx, ty, panHandlers: panResponder.panHandlers, handleTap, toggleZoom: () => live.current.zoomable && setZoom(!zoomedRef.current, { x: size.width / 2, y: size.height / 2 }) };
}
