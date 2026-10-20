/** Boşluk, köşe yarıçapı ve sabit ölçüler — kaynakta geçen piksel değerleri. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
} as const;

export const radii = {
  xs: 4,
  sm: 6, // rozet, sayaç
  md: 8,
  lg: 10, // fotoğraf
  xl: 12, // buton, alan
  card: 14, // ilan kartı
  sheet: 20,
  pill: 999, // çip (kaynakta 18 = yükseklik/2)
} as const;

export const sizes = {
  /** Referans cihaz (tasarım karşılaştırması) */
  referenceWidth: 390,
  referenceHeight: 844,
  buttonHeight: 52,
  fieldHeight: 52,
  chipHeight: 36,
  badgeHeight: 22,
  tabBarHeight: 56,
  minTouchTarget: 44,
  listingImageWidth: 116,
  listingImageHeight: 100,
} as const;
