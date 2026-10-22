/**
 * Neşeli Kamyon Tır Pazarı tasarım dili (designs/ klasöründeki ekranlardan ölçüldü).
 * Tasarım yalnızca açık tema içerdiği için uygulama açık temada çalışır.
 */

export const Colors = {
  navy: '#0A213F',
  navyRaised: '#0E2A4E',
  navyLine: '#1C416C',
  navyBorder: '#2E527A',
  green: '#18A749',
  greenSoft: '#88D59D',
  // Vurgu rengi: kampanya, öne çıkan ilan, hızlı aksiyonlar
  orange: '#FF7A1A',
  orangeDeep: '#F05A00',
  orangeSoft: '#FFF1E6',
  background: '#F2F4F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EFF2F9',
  surfaceHighlight: '#EDF2F9',
  chip: '#E5EAF1',
  text: '#111827',
  heading: '#0A213F',
  textSecondary: '#5F6B7A',
  textTertiary: '#98A2B3',
  border: '#E4E7EC',
  inputBorder: '#D9DEE5',
  disabled: '#D9DEE5',
  onDisabled: '#7B8494',
  danger: '#C5193B',
  dangerSoft: '#FDECEF',
  warning: '#B7791F',
  warningSoft: '#FCEEC5',
  success: '#13803B',
  successSoft: '#D8F5E5',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorName = keyof typeof Colors;

/** @expo-google-fonts ile yüklenen yazı tipi aileleri (src/app/_layout.tsx). */
export const Fonts = {
  heading: 'Montserrat_700Bold',
  headingHeavy: 'Montserrat_800ExtraBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;
