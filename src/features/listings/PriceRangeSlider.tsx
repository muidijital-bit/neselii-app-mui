import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';

import { formatInteger, parseWholeNumber } from '@/domain';
import { colors, shadows } from '@/theme';

import { PRICE_SLIDER_BASE_MAX_TL, PRICE_SLIDER_STEP_TL, nextEnd, scaleFor, snapToStep, type Thumb } from './priceSlider';

const THUMB = 24;
const HIT = 44;

type Props = {
  /** Sayı kutularındaki ham metin (tek doğruluk kaynağı formdur). */
  minText: string;
  maxText: string;
  /** `null` = alanı boşalt ("sınır yok"). */
  onChange: (end: Thumb, tl: number | null) => void;
  testID: string;
};

const numeric = (text: string): number | undefined => {
  const parsed = parseWholeNumber(text);
  return parsed.kind === 'value' ? parsed.value : undefined;
};

/**
 * İki uçlu fiyat kaydırıcısı (tasarım: 4px iz, yeşil dolgu, 24px beyaz yuvarlak uç). Sayı kutularıyla aynı durumu paylaşır:
 * boş uç kaydırıcıda iz sonunda durur ama form değerine DÖNÜŞMEZ; yalnızca uç sürüklenince/artır-azalt ile yazılır.
 * Ölçek başlangıçta 0–5.000.000 TL'dir; daha büyük yazılı değer ölçeği genişletir, hiçbir değer kırpılmaz.
 */
export function PriceRangeSlider({ minText, maxText, onChange, testID }: Props) {
  const typedMin = numeric(minText);
  const typedMax = numeric(maxText);
  const [scale, setScale] = useState(PRICE_SLIDER_BASE_MAX_TL);
  const needed = scaleFor(PRICE_SLIDER_BASE_MAX_TL, typedMax, typedMin);
  if (needed > scale) setScale(needed); // yalnızca büyür: sürükleme sırasında ölçek zıplamaz
  const scaleMax = Math.max(scale, needed);

  const [width, setWidth] = useState(0);
  const effMax = typedMax ?? scaleMax;
  const effMin = Math.min(typedMin ?? 0, effMax); // geçersiz (min > max) girişte uçlar çakışık gösterilir

  const live = useRef({ width, scaleMax, effMin, effMax, onChange });
  live.current = { width, scaleMax, effMin, effMax, onChange };

  const commit = (thumb: Thumb, wanted: number) => {
    const { scaleMax: s, effMin: lo, effMax: hi, onChange: emit } = live.current;
    emit(thumb, nextEnd(thumb, snapToStep(wanted, PRICE_SLIDER_STEP_TL, s), lo, hi, s).text);
  };

  const responders = useMemo(() => {
    const make = (thumb: Thumb) => {
      let start = 0;
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          start = thumb === 'min' ? live.current.effMin : live.current.effMax;
        },
        onPanResponderMove: (_event, gesture) => {
          const { width: w, scaleMax: s } = live.current;
          if (w > 0) commit(thumb, start + (gesture.dx / w) * s);
        },
      });
    };
    return { min: make('min'), max: make('max') };
  }, []);

  const onAction = (thumb: Thumb) => (event: AccessibilityActionEvent) => {
    const current = thumb === 'min' ? live.current.effMin : live.current.effMax;
    const delta = event.nativeEvent.actionName === 'increment' ? PRICE_SLIDER_STEP_TL : event.nativeEvent.actionName === 'decrement' ? -PRICE_SLIDER_STEP_TL : 0;
    if (delta !== 0) commit(thumb, current + delta);
  };

  const left = width > 0 ? (effMin / scaleMax) * width : 0;
  const right = width > 0 ? (effMax / scaleMax) * width : 0;
  const valueText = (thumb: Thumb) => {
    const typed = thumb === 'min' ? typedMin : typedMax;
    return typed === undefined ? 'Sınır yok' : `${formatInteger(typed)} TL`;
  };

  const renderThumb = (thumb: Thumb, x: number, label: string) => (
    <View
      key={thumb}
      {...responders[thumb].panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText(thumb) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction(thumb)}
      style={[styles.hit, { left: x - HIT / 2 }]}
      testID={`${testID}-${thumb}-thumb`}>
      <View style={styles.thumb} />
    </View>
  );

  return (
    <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} testID={testID}>
      <View style={styles.track} />
      <View style={[styles.fill, { left, width: Math.max(0, right - left) }]} />
      {renderThumb('min', left, 'Fiyat en az, kaydırıcı')}
      {renderThumb('max', right, 'Fiyat en çok, kaydırıcı')}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: THUMB, marginHorizontal: THUMB / 2 },
  track: { position: 'absolute', left: 0, right: 0, top: 10, height: 4, borderRadius: 2, backgroundColor: colors.line },
  fill: { position: 'absolute', top: 10, height: 4, borderRadius: 2, backgroundColor: colors.green },
  hit: { position: 'absolute', top: (THUMB - HIT) / 2, width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.green, ...shadows.subtle },
});
