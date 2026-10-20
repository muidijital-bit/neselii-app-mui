import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { StripePlaceholder } from '@/components/StripePlaceholder';
import { colors, fontFamily } from '@/theme';

/** Tasarımın referans yüksekliği (390 × 844): illüstrasyon yalnızca daha kısa ekranlarda orantılı küçülür, hiç büyümez. */
const REFERENCE_SCREEN_HEIGHT = 844;

/** Tasarımdaki "illüstrasyon · …" yer tutucusu (kaynakta da gerçek illüstrasyon yoktur; şerit rengi lacivert). */
export function IllustrationPlaceholder({ label, height: designHeight, width }: { label: string; height: number; width: number }) {
  const windowHeight = useWindowDimensions().height;
  const height = Math.round(designHeight * Math.min(1, windowHeight / REFERENCE_SCREEN_HEIGHT));
  return (
    <View style={[styles.box, { height }]} testID="onboarding-illustration" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <StripePlaceholder width={width} height={height} stripe={8} colorA={colors.navyRaised} colorB={colors.blue} style={StyleSheet.absoluteFill} />
      <Text style={styles.label} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fontFamily.inter500, fontSize: 11, color: colors.blueLight, letterSpacing: 0.44 },
});
