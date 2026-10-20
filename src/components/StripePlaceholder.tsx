import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';

import { colors } from '@/theme';

type Props = {
  width: number;
  height: number;
  /** Şerit kalınlığı (px) — kaynaktaki `repeating-linear-gradient(135deg, A 0 n, B n 2n)`. */
  stripe?: number;
  colorA?: string;
  colorB?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fotoğraf yer tutucusu: 135° çapraz şeritler (tasarımdaki `repeating-linear-gradient`).
 * CSS 135° degradesi sol üst köşeden başlar; renk `(x + y) / √2` boyunca değişir. Şeritler `x + y = sabit`
 * doğrularıyla sınırlanan paralelkenarlardır (SVG Pattern + dönüşüm iOS'ta bozuk çizildiği için poligon kullanılır).
 */
export function StripePlaceholder({ width, height, stripe = 6, colorA = colors.line, colorB = colors.stripe, style }: Props) {
  const band = stripe * Math.SQRT2; // x + y ekseninde bir şeridin genişliği
  const total = width + height;
  const bands: number[] = [];
  for (let start = band; start < total; start += band * 2) bands.push(start); // B renkli şeritlerin başlangıcı

  return (
    <View style={[{ width, height }, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={colorA} />
        {bands.map((start) => {
          const end = start + band;
          return <Polygon key={start} points={`${start},0 ${end},0 0,${end} 0,${start}`} fill={colorB} />;
        })}
      </Svg>
    </View>
  );
}
