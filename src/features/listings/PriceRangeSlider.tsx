import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';

import { formatInteger, parseWholeNumber } from '@/domain';
import { Colors, Radius } from '@/ui/theme';

import type { Thumb } from './priceSlider';

const THUMB = 44;
/** Erişilebilirlik artır/azalt adımı (konum biriminde). */
const A11Y_STEP = 0.02;

type SliderProps = {
  /** 0-1 aralığında konumlar; ölçekleme çağıran taraftadır. */
  low: number;
  high: number;
  /** Yalnızca hareket eden uç bildirilir (diğer ucun yazılı değeri yeniden hesaplanıp kırpılmasın). */
  onChange: (thumb: Thumb, position: number) => void;
  labels: { min: string; max: string };
  valueTexts: { min: string; max: string };
  thumbTestIDs: { min: string; max: string };
  testID: string;
};

/**
 * Main'deki çift tutamaçlı kaydırıcının (`@/ui/RangeSlider`) görünümü: 5px gri ray, yeşil dolgu, 44px beyaz/yeşil kenarlı uçlar.
 * Uçlar birbirini geçemez; üst üste bindiklerinde sürükleme yönü ucu seçer (sola → en az, sağa → en çok). Ekran okuyucu için
 * ayarlanabilir (artır/azalt) ve testID'lidir.
 */
export function FilterRangeSlider({ low, high, onChange, labels, valueTexts, thumbTestIDs, testID }: SliderProps) {
  const [width, setWidth] = useState(0);
  const track = Math.max(1, width - THUMB);
  const lo = Math.min(Math.max(low, 0), 1);
  const hi = Math.max(Math.min(Math.max(high, 0), 1), lo);

  const live = useRef({ track, lo, hi, onChange });
  live.current = { track, lo, hi, onChange };

  const move = (thumb: Thumb, wanted: number) => {
    const { lo: l, hi: h, onChange: emit } = live.current;
    const next = Math.min(1, Math.max(0, wanted));
    emit(thumb, thumb === 'min' ? Math.min(next, h) : Math.max(next, l));
  };

  // Sürükleme durumu tek yerde: tutamaklar üst üste bindiğinde hangi ucun hareket edeceği ilk harekette yöne göre seçilir.
  const drag = useRef<{ thumb: Thumb | null; start: number }>({ thumb: null, start: 0 });

  const responders = useMemo(() => {
    const make = (touched: Thumb) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const { lo: l, hi: h, track: t } = live.current;
          // Çakışmada (uçlar arası mesafe yarım tutamaktan az) üstteki tutamak dokunuşu alır ama hangi ucun gideceği henüz belli değil:
          // sola sürükleme "en az"ı, sağa sürükleme "en çok"u taşır. Aksi halde biri sona sıkıştığında diğeri geri çekilemiyordu.
          const overlapping = (h - l) * t < THUMB / 2;
          drag.current = { thumb: overlapping ? null : touched, start: touched === 'min' ? l : h };
        },
        onPanResponderMove: (_event, gesture) => {
          const state = drag.current;
          if (state.thumb === null) {
            if (gesture.dx === 0) return;
            state.thumb = gesture.dx < 0 ? 'min' : 'max';
            state.start = state.thumb === 'min' ? live.current.lo : live.current.hi;
          }
          move(state.thumb, state.start + gesture.dx / live.current.track);
        },
        onPanResponderRelease: () => {
          drag.current.thumb = null;
        },
        onPanResponderTerminate: () => {
          drag.current.thumb = null;
        },
      });
    return { min: make('min'), max: make('max') };
  }, []);

  const onAction = (thumb: Thumb) => (event: AccessibilityActionEvent) => {
    const current = thumb === 'min' ? live.current.lo : live.current.hi;
    const delta = event.nativeEvent.actionName === 'increment' ? A11Y_STEP : event.nativeEvent.actionName === 'decrement' ? -A11Y_STEP : 0;
    if (delta !== 0) move(thumb, current + delta);
  };

  const renderThumb = (thumb: Thumb, position: number) => (
    <View
      key={thumb}
      {...responders[thumb].panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={labels[thumb]}
      accessibilityValue={{ text: valueTexts[thumb] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction(thumb)}
      style={[styles.thumb, { left: position * track }]}
      testID={thumbTestIDs[thumb]}
    />
  );

  return (
    <View style={styles.container} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} testID={testID}>
      <View style={styles.rail} />
      <View style={[styles.active, { left: THUMB / 2 + lo * track, width: (hi - lo) * track }]} />
      {renderThumb('min', lo)}
      {renderThumb('max', hi)}
    </View>
  );
}

/** Karesel ölçek (main): düşük değerlerde daha hassas. `toValue` adıma yuvarlar; `toPosition` boş değerde `fallback` konumunu verir. */
export const quadraticScale = (max: number, step: number) => ({
  toValue: (t: number) => Math.round((t * t * max) / step) * step,
  toPosition: (v: number | undefined, fallback: number) => (v == null ? fallback : Math.sqrt(Math.min(v, max) / max)),
});

/** Doğrusal ölçek (model yılı). */
export const linearScale = (min: number, max: number) => ({
  toValue: (t: number) => Math.round(min + t * (max - min)),
  toPosition: (v: number | undefined, fallback: number) => (v == null ? fallback : (Math.min(Math.max(v, min), max) - min) / (max - min)),
});

/** Form metni → sayı (geçersiz/boş → `undefined`). */
export const numericText = (text: string): number | undefined => {
  const parsed = parseWholeNumber(text);
  return parsed.kind === 'value' ? parsed.value : undefined;
};

// Main'deki fiyat ölçeği: 0 – 10.000.000 TL, karesel, 25.000 TL adım. Ölçek yalnızca yardımcıdır: daha büyük yazılı değer kırpılmaz
// (uç sonda durur), yalnızca o uç sürüklenirse yeniden yazılır.
export const PRICE_MAX_TL = 10_000_000;
const priceScale = quadraticScale(PRICE_MAX_TL, 25_000);

type Props = {
  /** Sayı kutularındaki ham metin (tek doğruluk kaynağı formdur). */
  minText: string;
  maxText: string;
  /** `null` = alanı boşalt ("sınır yok"). */
  onChange: (end: Thumb, tl: number | null) => void;
  testID: string;
};

/** İki uçlu fiyat kaydırıcısı: sayı kutularıyla aynı durumu paylaşır; uçlar ölçek sınırındayken alan boş ("sınır yok") olur. */
export function PriceRangeSlider({ minText, maxText, onChange, testID }: Props) {
  const typedMin = numericText(minText);
  const typedMax = numericText(maxText);
  const valueText = (typed: number | undefined) => (typed === undefined ? 'Sınır yok' : `${formatInteger(typed)} TL`);
  return (
    <FilterRangeSlider
      low={priceScale.toPosition(typedMin, 0)}
      high={priceScale.toPosition(typedMax, 1)}
      onChange={(thumb, position) => {
        const value = priceScale.toValue(position);
        onChange(thumb, thumb === 'min' ? (value > 0 ? value : null) : value < PRICE_MAX_TL ? value : null);
      }}
      labels={{ min: 'Fiyat en az, kaydırıcı', max: 'Fiyat en çok, kaydırıcı' }}
      valueTexts={{ min: valueText(typedMin), max: valueText(typedMax) }}
      thumbTestIDs={{ min: `${testID}-min-thumb`, max: `${testID}-max-thumb` }}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  container: { height: THUMB, justifyContent: 'center' },
  rail: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.disabled,
  },
  active: { position: 'absolute', height: 5, borderRadius: Radius.pill, backgroundColor: Colors.green },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.green,
  },
});
