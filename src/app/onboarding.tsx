import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Logo } from '@/components/logo';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { completeOnboarding } from '@/lib/app-storage';
import { requestLocationPermission, requestNotificationPermission } from '@/lib/permissions';

type Page = {
  key: string;
  illustration: IconName;
  eyebrow: string;
  title: string;
  body?: string;
  bullets?: { icon: IconName; text: string }[];
  primary: { title: string; icon?: IconName; action?: () => Promise<unknown> };
  secondary?: string;
};

const pages: Page[] = [
  {
    key: 'welcome',
    illustration: 'mci:truck-trailer',
    eyebrow: 'Hoş geldiniz',
    title: 'Firmamızın filosundan kamyon, çekici, dorse ve ticari araç ilanları',
    primary: { title: 'Devam' },
  },
  {
    key: 'notifications',
    illustration: 'bell',
    eyebrow: 'Bildirimler',
    title: 'Gelişmeleri kaçırmayın',
    body: 'Size yalnızca şu durumlarda bildirim göndeririz:',
    bullets: [
      { icon: 'tag', text: 'Yeni ilan yayımlandığında' },
      { icon: 'trending-down', text: 'Fiyat veya ilan durumu değiştiğinde' },
      { icon: 'message-circle', text: 'Mesajınıza cevap verildiğinde' },
    ],
    primary: { title: 'Bildirimlere İzin Ver', icon: 'bell', action: requestNotificationPermission },
    secondary: 'Şimdi Değil',
  },
  {
    key: 'location',
    illustration: 'map-pin',
    eyebrow: 'Konum · İsteğe bağlı',
    title: 'Size yakın ilanları önce gösterelim',
    body: 'Konumunuz yalnızca ilanları size olan uzaklığa göre sıralamak için kullanılır.',
    primary: { title: 'Konuma İzin Ver', icon: 'map-pin', action: requestLocationPermission },
    secondary: 'Şimdi Değil',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<Page>>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const next = () => {
    if (index >= pages.length - 1) {
      completeOnboarding();
      return;
    }
    list.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex(index + 1);
  };

  const onPrimary = async () => {
    const action = pages[index].primary.action;
    if (action) {
      setBusy(true);
      try {
        await action();
      } catch {
        // İzin penceresi açılamazsa (ör. web) sessizce devam et
      } finally {
        setBusy(false);
      }
    }
    next();
  };

  const page = pages[index];

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.three }]}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <Logo height={40} />
        <Pressable hitSlop={12} onPress={completeOnboarding}>
          <Text variant="bodySemibold" style={styles.white}>
            Atla
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={list}
        data={pages}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.key}
        getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <View style={styles.illustration}>
              <Icon name={item.illustration} size={96} color={Colors.greenSoft} />
            </View>
            <Text variant="overline" style={styles.eyebrow}>
              {item.eyebrow}
            </Text>
            <Text variant="display" style={styles.white}>
              {item.title}
            </Text>
            {item.body ? (
              <Text variant="body" style={styles.body}>
                {item.body}
              </Text>
            ) : null}
            {item.bullets?.map((b) => (
              <View key={b.text} style={styles.bullet}>
                <View style={styles.bulletIcon}>
                  <Icon name={b.icon} size={24} color="green" />
                </View>
                <Text variant="bodyMedium" style={[styles.white, styles.flex]}>
                  {b.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      />

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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  page: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.three },
  illustration: {
    height: 220,
    borderRadius: Radius.xl + 4,
    backgroundColor: Colors.navyRaised,
    borderWidth: 1,
    borderColor: Colors.navyLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  eyebrow: { color: Colors.green, fontSize: 14 },
  body: { color: '#D5DEEA', fontSize: 18, lineHeight: 27 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bulletIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.navyRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  dots: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  dot: { width: 10, height: 10, borderRadius: Radius.pill, backgroundColor: '#3A6EA5' },
  dotActive: { width: 32, backgroundColor: Colors.green },
});
