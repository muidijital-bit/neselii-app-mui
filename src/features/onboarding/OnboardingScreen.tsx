import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePhotoWallQuery } from '@/features/listings/useListingsQueries';
import { usePermissions } from '@/permissions';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon, type IconName } from '@/ui/Icon';
import { Logo } from '@/ui/Logo';
import { PhotoWall } from '@/ui/PhotoWall';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';

import { useOnboarding } from './OnboardingProvider';

type PermissionKind = 'notifications' | 'location';

type Page = {
  key: string;
  /** Ekran kabının testID'si (adım başına). */
  testID: string;
  /** Turuncu üst etiket. ZATEN büyük harfle verilir: `textTransform: 'uppercase'` Türkçe İ kuralını uygulamaz ("Bildirimler" → "BILDIRIMLER"). */
  eyebrow: string;
  title: string;
  body: string;
  bullets?: { icon: IconName; text: string }[];
  primary: { title: string; icon?: IconName; permission?: PermissionKind; testID: string };
  secondary?: { title: string; testID: string };
};

const pages: Page[] = [
  {
    key: 'welcome',
    testID: 'onboarding-intro',
    eyebrow: 'NEŞELİ KAMYON TIR PAZARI',
    title: 'Filomuzdaki araçlar artık cebinde',
    body: 'Kamyon, çekici, dorse ve ticari araç ilanlarını incele, fiyatları karşılaştır, firmamızla anında mesajlaş.',
    primary: { title: 'Başlayalım', icon: 'arrow-right', testID: 'onboarding-continue' },
  },
  {
    key: 'notifications',
    testID: 'onboarding-notifications',
    eyebrow: 'BİLDİRİMLER',
    title: 'Fırsatları ilk sen yakala',
    body: 'Sadece seni ilgilendiren durumlarda haber veririz:',
    bullets: [
      { icon: 'tag', text: 'Aradığın kriterde yeni ilan çıktığında' },
      { icon: 'trending-down', text: 'Favori ilanının fiyatı düştüğünde' },
      { icon: 'message-circle', text: 'Mesajına cevap geldiğinde' },
    ],
    primary: { title: 'Bildirimlere İzin Ver', icon: 'bell', permission: 'notifications', testID: 'notifications-allow' },
    secondary: { title: 'Şimdi Değil', testID: 'notifications-later' },
  },
  {
    key: 'location',
    testID: 'onboarding-location',
    eyebrow: 'KONUM · İSTEĞE BAĞLI',
    title: 'Sana en yakın araçlar önde',
    body: 'Konumun yalnızca ilanları sana olan uzaklığa göre sıralamak için kullanılır, hiçbir yere kaydedilmez.',
    primary: { title: 'Konuma İzin Ver', icon: 'map-pin', permission: 'location', testID: 'location-allow' },
    secondary: { title: 'Şimdi Değil', testID: 'location-later' },
  },
];

/** Logo çubuğunun yüksekliği: akan duvar bu çubuğun altından başlar, logo her zaman düz zeminde kalır. */
const TOP_BAR_HEIGHT = 52;
/** Bu yüksekliğin altındaki ekranlar (ör. iPhone SE 375×667) "kısa" sayılır: metin bloğu sıkılaşır. */
const COMPACT_HEIGHT = 700;
/** Büyük ekranda duvarın üst sınırı (ekran yüksekliğine oranla, logo çubuğu dahil): tasarımdaki görünüm. */
const WALL_MAX_RATIO = 0.62;
/**
 * Metin bloğunun üstünün (turuncu üst etiket) duvara binebileceği pay, duvar yüksekliğine oranla. `PhotoWall`'un alt solması yüksekliğin
 * %62'sidir ve son %45'inde %88'den tam koyuya çıkar: alttaki %15'lik payda koyuluk ~%94'ün üstündedir, etiketin arkasında fotoğraf seçilmez.
 */
const WALL_SOLID_FADE = 0.15;
/** Duvar yüksekliği geçişi: metin bloğunun giriş animasyonuyla aynı sürede. */
const WALL_TIMING = { duration: 450, easing: Easing.out(Easing.cubic) };

/**
 * Tanıtım (main `onboarding.tsx` ile birebir): üç adım TEK ekranda. Fotoğraf duvarı adımlar boyunca kesintisiz akar; adım değişince
 * yalnız metin bloğu aşağıdan solarak girer. Sistem izinleri YALNIZCA birincil düğmeyle istenir; ret/hata ilerlemeyi engellemez.
 * Son adımdan sonra (izin ya da "Şimdi Değil") tanıtım tamamlanır.
 */
export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const photos = usePhotoWallQuery();
  const permissions = usePermissions();
  const { complete } = useOnboarding();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const page = pages[index];
  const compact = height < COMPACT_HEIGHT;
  // Duvar, alttan hizalı metin bloğunun (üst etiket + başlık + metin + maddeler + düğmeler) ÖLÇÜLEN üst kenarına kadar uzanır: alt solma
  // tam koyulaştığı yerde metin başlar, hiçbir ekran boyunda üst etiket/başlık fotoğrafların üstüne binmez. Kısa adımda (Hoş geldin) duvar
  // uzar, uzun adımda (Bildirimler) kısalır; boş lacivert bant kalmaz. Yükseklik değişimi yumuşak geçişle olur, fotoğraf akışı kesilmez
  // (duvar en büyük yükseklikte çizilir, kap kırpar). Büyük ekranda üst sınır tasarımdaki orandır (önceki görünüm).
  const wallTop = insets.top + TOP_BAR_HEIGHT;
  const wallMax = Math.max(0, height * WALL_MAX_RATIO - wallTop);
  const [textTop, setTextTop] = useState<number | null>(null);
  const wallHeight = useSharedValue(wallMax);
  const wallMeasured = useRef(false);
  const wallStyle = useAnimatedStyle(() => ({ height: wallHeight.value }));

  useEffect(() => {
    if (textTop === null) return;
    const target = Math.min(wallMax, Math.max(0, (textTop - wallTop) / (1 - WALL_SOLID_FADE)));
    // İlk ölçümde duvar doğrudan yerine oturur (açılışta küçülme animasyonu görünmez); adım değişince yumuşakça uzar/kısalır.
    wallHeight.set(wallMeasured.current ? withTiming(target, WALL_TIMING) : target);
    wallMeasured.current = true;
  }, [textTop, wallTop, wallMax, wallHeight]);

  // Android geri tuşu: önceki tanıtım adımına döner (3 → 2 → 1); ilk adımda varsayılan davranış (uygulamadan çıkış/geri) işler.
  // Dinleyici yalnız ekran odaktayken kayıtlıdır: tanıtım yığında arkada kalsa bile geri tuşunu başka ekranlarda yutamaz.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (index === 0) return false;
        setIndex(index - 1);
        return true;
      });
      return () => subscription.remove();
    }, [index]),
  );

  const next = () => {
    if (index >= pages.length - 1) void complete();
    else setIndex(index + 1);
  };

  const onPrimary = async () => {
    if (inFlight.current) return; // çift dokunuşta ikinci sistem penceresi açılmaz
    const permission = page.primary.permission;
    if (permission) {
      inFlight.current = true;
      setBusy(true);
      try {
        if (permission === 'notifications') await permissions.requestNotifications();
        else await permissions.requestLocation();
      } catch {
        // İzin penceresi açılamazsa sessizce devam edilir (izin isteğe bağlıdır).
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    }
    next();
  };

  return (
    <View style={styles.container} testID={page.testID}>
      <FocusStatusBar style="light" />
      {/* Duvar logo çubuğunun altından başlar; logo her zaman düz zeminde kalır */}
      <Animated.View style={[styles.wall, { top: wallTop }, wallStyle]} pointerEvents="none">
        <PhotoWall photos={photos.data ?? []} height={wallMax} style={styles.wallFill} />
      </Animated.View>

      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]}>
        <Logo height={36} />
        <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Atla" onPress={() => void complete()} style={styles.skip} testID="onboarding-skip">
          <Text variant="smallSemibold" style={styles.white}>
            Atla
          </Text>
        </Pressable>
      </View>

      <View style={styles.flex} />

      {/* Metin bloğu + alt çubuk: üst kenarı ölçülür, duvar bu kenara göre boyutlanır */}
      <View onLayout={(e) => setTextTop(e.nativeEvent.layout.y)}>
        <Animated.View key={page.key} entering={FadeInDown.duration(450)} style={[styles.content, compact && styles.contentCompact]}>
          <Text style={styles.eyebrow}>{page.eyebrow}</Text>
          <Text variant="display" style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
            {page.title}
          </Text>
          <Text variant="body" style={[styles.body, compact && styles.bodyCompact]}>
            {page.body}
          </Text>
          {page.bullets?.map((b) => (
            <View key={b.text} style={styles.bullet}>
              <View style={[styles.bulletIcon, compact && styles.bulletIconCompact]}>
                <Icon name={b.icon} size={18} color="white" />
              </View>
              <Text variant="bodyMedium" style={[styles.white, styles.flex]}>
                {b.text}
              </Text>
            </View>
          ))}
        </Animated.View>

        <View style={[styles.footer, compact && styles.footerCompact, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.dots} accessible accessibilityLabel={`Adım ${index + 1} / ${pages.length}`}>
            {pages.map((p, i) => (
              <View key={p.key} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <Button title={page.primary.title} icon={page.primary.icon} loading={busy} onPress={() => void onPrimary()} testID={page.primary.testID} />
          {page.secondary ? <Button title={page.secondary.title} variant="outlineDark" disabled={busy} onPress={next} testID={page.secondary.testID} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  flex: { flex: 1 },
  white: { color: Colors.white },
  wall: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  // Duvar kabın (animasyonlu) yüksekliğini doldurur; solmalar yüzdeyle tanımlı olduğu için kabın alt kenarına yapışık kalır.
  wallFill: { height: '100%' },
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
  contentCompact: { gap: Spacing.two, paddingBottom: Spacing.three },
  eyebrow: { fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 1.4, color: Colors.orange },
  title: { color: Colors.white, fontSize: 32, lineHeight: 39 },
  titleCompact: { fontSize: 26, lineHeight: 32 },
  body: { color: '#C9D5E5', fontSize: 17, lineHeight: 25 },
  bodyCompact: { fontSize: 16, lineHeight: 23 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bulletIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletIconCompact: { width: 32, height: 32 },
  footer: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  footerCompact: { gap: Spacing.two },
  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 28, backgroundColor: Colors.white },
});
