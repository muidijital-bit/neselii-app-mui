import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Logo } from '@/components/logo';
import { PhotoWall } from '@/components/photo-wall';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { completeOnboarding } from '@/lib/app-storage';
import { requestLocationPermission, requestNotificationPermission } from '@/lib/permissions';

type Page = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: { icon: IconName; text: string }[];
  primary: { title: string; icon?: IconName; action?: () => Promise<unknown> };
  secondary?: string;
};

const pages: Page[] = [
  {
    key: 'welcome',
    eyebrow: 'Neşeli Kamyon Tır Pazarı',
    title: 'Filomuzdaki araçlar artık cebinde',
    body: 'Kamyon, çekici, dorse ve ticari araç ilanlarını incele, fiyatları karşılaştır, firmamızla anında mesajlaş.',
    primary: { title: 'Başlayalım', icon: 'arrow-right' },
  },
  {
    key: 'notifications',
    eyebrow: 'Bildirimler',
    title: 'Fırsatları ilk sen yakala',
    body: 'Sadece seni ilgilendiren durumlarda haber veririz:',
    bullets: [
      { icon: 'tag', text: 'Aradığın kriterde yeni ilan çıktığında' },
      { icon: 'trending-down', text: 'Favori ilanının fiyatı düştüğünde' },
      { icon: 'message-circle', text: 'Mesajına cevap geldiğinde' },
    ],
    primary: { title: 'Bildirimlere İzin Ver', icon: 'bell', action: requestNotificationPermission },
    secondary: 'Şimdi Değil',
  },
  {
    key: 'location',
    eyebrow: 'Konum · İsteğe bağlı',
    title: 'Sana en yakın araçlar önde',
    body: 'Konumun yalnızca ilanları sana olan uzaklığa göre sıralamak için kullanılır, hiçbir yere kaydedilmez.',
    primary: { title: 'Konuma İzin Ver', icon: 'map-pin', action: requestLocationPermission },
    secondary: 'Şimdi Değil',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const page = pages[index];

  const next = () => {
    if (index >= pages.length - 1) completeOnboarding();
    else setIndex(index + 1);
  };

  const onPrimary = async () => {
    if (page.primary.action) {
      setBusy(true);
      try {
        await page.primary.action();
      } catch {
        // İzin penceresi açılamazsa (ör. web) sessizce devam et
      } finally {
        setBusy(false);
      }
    }
    next();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Duvar logo çubuğunun altından başlar; logo her zaman düz zeminde kalır */}
      <PhotoWall height={height * 0.62 - insets.top - 52} style={[styles.wall, { top: insets.top + 52 }]} />

      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]}>
        <Logo height={36} />
        <Pressable hitSlop={12} onPress={completeOnboarding} style={styles.skip}>
          <Text variant="smallSemibold" style={styles.white}>
            Atla
          </Text>
        </Pressable>
      </View>

      <View style={styles.flex} />

      <Animated.View key={page.key} entering={FadeInDown.duration(450)} style={styles.content}>
        <Text style={styles.eyebrow}>{page.eyebrow}</Text>
        <Text variant="display" style={styles.title}>
          {page.title}
        </Text>
        <Text variant="body" style={styles.body}>
          {page.body}
        </Text>
        {page.bullets?.map((b) => (
          <View key={b.text} style={styles.bullet}>
            <View style={styles.bulletIcon}>
              <Icon name={b.icon} size={18} color="white" />
            </View>
            <Text variant="bodyMedium" style={[styles.white, styles.flex]}>
              {b.text}
            </Text>
          </View>
        ))}
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={styles.dots}>
          {pages.map((p, i) => (
            <View key={p.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button title={page.primary.title} icon={page.primary.icon} loading={busy} onPress={onPrimary} />
        {page.secondary ? <Button title={page.secondary} variant="outlineDark" onPress={next} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  flex: { flex: 1 },
  white: { color: Colors.white },
  wall: { position: 'absolute', left: 0, right: 0 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  skip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.four },
  eyebrow: { fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: Colors.orange },
  title: { color: Colors.white, fontSize: 32, lineHeight: 39 },
  body: { color: '#C9D5E5', fontSize: 17, lineHeight: 25 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bulletIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 28, backgroundColor: Colors.white },
});
