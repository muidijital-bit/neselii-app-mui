import { Platform, type TextStyle } from 'react-native';

/**
 * Tipografi — kaynak: Montserrat 500–800 (başlık/fiyat) ve Inter 400–700 (gövde).
 * Özel fontlarda `fontWeight` yerine ağırlığa özel aile adı kullanılır (iOS ve Android'de aynı sonuç).
 * Kaynaktaki CSS `line-height` oranları piksele çevrilmiştir; en az `MIN_LINE_HEIGHT_RATIO` uygulanır.
 */
export const fontFamily = {
  inter400: 'Inter_400Regular',
  inter500: 'Inter_500Medium',
  inter600: 'Inter_600SemiBold',
  inter700: 'Inter_700Bold',
  montserrat500: 'Montserrat_500Medium',
  montserrat600: 'Montserrat_600SemiBold',
  montserrat700: 'Montserrat_700Bold',
  montserrat800: 'Montserrat_800ExtraBold',
} as const;

/**
 * iOS, satır kutusunun dışına taşan glifleri kırpar. Kaynaktaki `line-height: 1` ile Türkçe büyük harflerin
 * noktaları/kırık işaretleri (İ, Ö, Ü, Ğ) kesilir ("İlan" → "Ilan"); iOS 18.1'de ölçüldü: oran ≥ 1.1'de görünür.
 * Güvenli taraf için en az 1.2 kullanılır. Buton, çip, rozet gibi sabit yükseklikli ve ortalı kaplarda
 * görsel konum değişmez.
 */
export const MIN_LINE_HEIGHT_RATIO = 1.2;

type Family = 'inter' | 'montserrat';
type Weight = 400 | 500 | 600 | 700 | 800;

function text(family: Family, weight: Weight, size: number, lineHeightRatio?: number): TextStyle {
  const key = `${family}${weight}` as keyof typeof fontFamily;
  const base: TextStyle = { fontFamily: fontFamily[key], fontSize: size };
  if (lineHeightRatio === undefined) return base;
  return { ...base, lineHeight: Math.round(size * Math.max(lineHeightRatio, MIN_LINE_HEIGHT_RATIO) * 100) / 100 };
}

export const textStyles = {
  // Montserrat — başlıklar, fiyat, sayaçlar
  titleHero: text('montserrat', 700, 26, 1.3), // onboarding başlığı
  titleLarge: text('montserrat', 700, 22, 1.2),
  titlePage: text('montserrat', 700, 18, 1.2),
  titleSection: text('montserrat', 700, 16, 1.2),
  cardTitle: text('montserrat', 600, 14, 1.3),
  price: text('montserrat', 700, 16, 1),
  count: text('montserrat', 600, 12, 1), // "96 ilan", çip sayısı

  // Inter — gövde ve arayüz
  body: text('inter', 400, 15),
  bodyRelaxed: text('inter', 400, 15, 1.5),
  bodySmall: text('inter', 400, 14, 1.5),
  caption: text('inter', 400, 12, 1.3), // ipucu, meta
  label: text('inter', 500, 13, 1.2), // alan etiketi
  button: text('inter', 600, 15, 1),
  chip: text('inter', 500, 14, 1),
  badge: text('inter', 600, 11, 1),
  tag: text('inter', 500, 11, 1), // ilan kartı kategori etiketi
  tabActive: text('inter', 600, 10, 1),
  tabInactive: text('inter', 500, 10, 1),
  tabCount: text('inter', 700, 10, 1.4),
  eyebrow: { ...text('inter', 600, 12, 1), letterSpacing: 1.44 } as TextStyle, // .12em
  // Kaynakta `ui-monospace, Menlo`: iOS'ta Menlo, Android'de sistem monospace.
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 9, lineHeight: 10.8 } as TextStyle,
} as const;

export type TextStyleName = keyof typeof textStyles;
