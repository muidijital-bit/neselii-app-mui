import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Küçük, ölçülü arayüz hareketleri (reanimated). Hepsi "Hareketi azalt" açıkken anında/devre dışıdır: giriş animasyonları
 * `ReduceMotion.System` ile atlanır, ölçek animasyonları `useReducedMotion` ile hiç başlatılmaz. Liste satırlarında yalnızca
 * ilk görünen birkaç öğeye uygulanır (bkz. `useEntranceWindow`); kaydırma sırasında yeni bağlanan satırlar animasyonsuz gelir.
 */

/** Basınca ölçeklenen kartlar için animasyonlu `Pressable` (stil fonksiyonu yerine dizi stil + `usePressScale`). */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Kademeli girişte bir sonraki öğenin gecikmesi ve en fazla kaç adım kademelendirileceği (sonrakiler aynı anda gelir). */
const STAGGER_MS = 55;
const MAX_STAGGER_STEPS = 6;
const ENTER_MS = 320;

/** Aşağıdan hafifçe (12 pt) yükselerek solan giriş; `index` kademeli gecikmeyi belirler. */
export function enterFadeUp(index = 0) {
  return FadeInDown.delay(Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS)
    .duration(ENTER_MS)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
    .reduceMotion(ReduceMotion.System);
}

/** Yalnız opaklıkla giriş (yerinde beliren içerik: yüklenince gelen ızgara/karusel). */
export function enterFade(index = 0) {
  return FadeIn.delay(Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS)
    .duration(ENTER_MS - 60)
    .reduceMotion(ReduceMotion.System);
}

/**
 * Liste verisi ilk kez hazır olduğunda kısa bir "giriş penceresi" açar (`ms` sonra kapanır). Pencere açıkken bağlanan ilk satırlar
 * giriş animasyonu alır; sonradan bağlananlar (sonsuz kaydırma, uzaktan geri dönüş, yenilenen veri) animasyonsuz gelir.
 */
export function useEntranceWindow(ready: boolean, ms = 900): boolean {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!ready || !open) return;
    const timer = setTimeout(() => setOpen(false), ms);
    return () => clearTimeout(timer);
  }, [ready, open, ms]);
  return open;
}

const PRESS_IN = { duration: 110, easing: Easing.out(Easing.quad) };
const PRESS_OUT = { damping: 18, stiffness: 320, mass: 0.6 };

/** Basılı tutulunca hafifçe küçülen, bırakınca yaylanarak dönen ölçek. Hareketi azalt açıkken ölçek anında değişir (animasyonsuz). */
export function usePressScale(pressedScale = 0.98) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => scale.set(reduceMotion ? pressedScale : withTiming(pressedScale, PRESS_IN)), [reduceMotion, pressedScale, scale]);
  const onPressOut = useCallback(() => scale.set(reduceMotion ? 1 : withSpring(1, PRESS_OUT)), [reduceMotion, scale]);
  return { style, onPressIn, onPressOut };
}

const POP_SPRING = { damping: 9, stiffness: 260, mass: 0.6 };

/**
 * Favori kalbi "pop"u: eklerken büyüyüp yaylanarak, çıkarırken hafifçe içe çöküp geri döner. Kullanıcının dokunuşuyla tetiklenir
 * (veri yüklenince değişen durum animasyon başlatmaz). Hareketi azalt açıkken hiçbir şey yapmaz.
 */
export function usePop() {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pop = useCallback(
    (grow: boolean) => {
      if (reduceMotion) return;
      scale.set(withSequence(withTiming(grow ? 1.3 : 0.8, { duration: 110, easing: Easing.out(Easing.quad) }), withSpring(1, POP_SPRING)));
    },
    [reduceMotion, scale],
  );
  return { style, pop };
}

/** Değer değişince (ilk değerde değil) küçük bir nabız; ör. filtre ekranındaki "N ilanı göster" sayısı değişince. */
export function usePulseOnChange(value: unknown) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(value);
  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    if (reduceMotion) return;
    scale.set(withSequence(withTiming(1.03, { duration: 120, easing: Easing.out(Easing.quad) }), withSpring(1, PRESS_OUT)));
  }, [value, reduceMotion, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}
