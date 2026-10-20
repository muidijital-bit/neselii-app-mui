import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { Screen } from '@/components/Screen';
import { colors, spacing, textStyles } from '@/theme';

type Props = {
  /** 0–2: sayfa noktalarında etkin adım. */
  step: 0 | 1 | 2;
  onSkip: () => void;
  children: ReactNode;
  footer: ReactNode;
  testID: string;
};

/** Bu yazı ölçeğinden büyükte nokta göstergesi ve alt eylemler içerikle birlikte kayar (sabit kalsalar içeriğe yer kalmaz). */
const STICKY_FOOTER_MAX_FONT_SCALE = 1.3;
/** "Atla" sabit yükseklikli başlık satırında durur: yazı ölçeğini yalnız bu orana kadar izler. */
const SKIP_MAX_FONT_SCALE = 1.5;
/** 26 pt başlık: 375 pt genişlikte en büyük sistem yazısında kelimeler ortadan bölünmesin diye sınırlanır. */
const TITLE_MAX_FONT_SCALE = 1.5;

/** 00b–00d ortak iskeleti: logo + "Atla", ortada (kaydırılabilir) içerik, nokta göstergesi ve alt eylemler. */
export function OnboardingFrame({ step, onSkip, children, footer, testID }: Props) {
  const stickyFooter = useWindowDimensions().fontScale <= STICKY_FOOTER_MAX_FONT_SCALE;
  const dots = (
    <View style={styles.dots} accessibilityLabel={`Adım ${step + 1} / 3`} accessible>
      {[0, 1, 2].map((index) => (
        <View key={index} style={[styles.dot, index === step ? styles.dotActive : styles.dotIdle]} />
      ))}
    </View>
  );
  const footerView = <View style={styles.footer}>{footer}</View>;
  return (
    <Screen background={colors.navy} statusBar="light" testID={testID}>
      <View style={styles.page}>
        <View style={styles.header}>
          <BrandLogo height={26} />
          <Pressable accessibilityRole="button" accessibilityLabel="Atla" hitSlop={8} onPress={onSkip} style={styles.skip} testID="onboarding-skip">
            <Text style={[textStyles.button, styles.skipText]} maxFontSizeMultiplier={SKIP_MAX_FONT_SCALE}>
              Atla
            </Text>
          </Pressable>
        </View>
        {/* Küçük ekran / büyük yazıda içerik taşarsa logo-Atla, nokta göstergesi ve alt eylemler sabit kalır; yalnız içerik kayar. */}
        <ScrollView style={styles.scroll} testID="onboarding-scroll" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
          {children}
          {stickyFooter ? null : dots}
          {stickyFooter ? null : footerView}
        </ScrollView>
        {stickyFooter ? dots : null}
        {stickyFooter ? footerView : null}
      </View>
    </Screen>
  );
}

/**
 * Başlık bloğu: yeşil üst etiket + başlık + isteğe bağlı açıklama. `eyebrow` ZATEN büyük harfle yazılır: `textTransform: 'uppercase'`
 * Türkçe İ/ı kuralını uygulamaz ("Bildirimler" → "BILDIRIMLER" olur; tasarım "BİLDİRİMLER" ister).
 */
export function OnboardingHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={[textStyles.badge, styles.eyebrow]}>{eyebrow}</Text>
      <Text style={[textStyles.titleHero, styles.title]} accessibilityRole="header" maxFontSizeMultiplier={TITLE_MAX_FONT_SCALE}>
        {title}
      </Text>
      {body ? <Text style={[textStyles.bodyRelaxed, styles.body]}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: spacing['3xl'], paddingTop: 4, paddingBottom: spacing.xl },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { height: 44, paddingHorizontal: 4, justifyContent: 'center' },
  skipText: { color: colors.white },
  scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: spacing['4xl'] },
  dots: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing['3xl'] },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: colors.green },
  dotIdle: { width: 8, backgroundColor: colors.blueMid },
  footer: { gap: 10 },
  heading: { gap: spacing.lg },
  eyebrow: { color: colors.greenBright, letterSpacing: 1.44 },
  title: { color: colors.white },
  body: { color: colors.bluePale },
});
