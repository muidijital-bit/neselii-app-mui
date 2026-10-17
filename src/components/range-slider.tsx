import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

const THUMB = 44;

type Props = {
  /** 0-1 aralığında konumlar */
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
};

type Drag = { thumb: 'low' | 'high'; startX: number; startValue: number };

/** Çift tutamaçlı kaydırıcı. Değerler 0-1 aralığındadır; ölçekleme çağıran taraftadır. */
export function RangeSlider({ low, high, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const track = Math.max(1, width - THUMB);

  const handlers = (thumb: 'low' | 'high') => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) =>
      setDrag({ thumb, startX: e.nativeEvent.pageX, startValue: thumb === 'low' ? low : high }),
    onResponderMove: (e: GestureResponderEvent) => {
      if (!drag || drag.thumb !== thumb) return;
      const next = Math.min(1, Math.max(0, drag.startValue + (e.nativeEvent.pageX - drag.startX) / track));
      if (thumb === 'low') onChange(Math.min(next, high), high);
      else onChange(low, Math.max(next, low));
    },
    onResponderRelease: () => setDrag(null),
    onResponderTerminate: () => setDrag(null),
  });

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.rail} />
      <View style={[styles.active, { left: THUMB / 2 + low * track, width: (high - low) * track }]} />
      <View
        {...handlers('low')}
        accessibilityLabel="En düşük fiyat"
        style={[styles.thumb, { left: low * track }]}
      />
      <View
        {...handlers('high')}
        accessibilityLabel="En yüksek fiyat"
        style={[styles.thumb, { left: high * track }]}
      />
    </View>
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
