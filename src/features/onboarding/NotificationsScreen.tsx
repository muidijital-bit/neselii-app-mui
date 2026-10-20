import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Icon, type IconName } from '@/components/icons/Icon';
import { usePermissions } from '@/permissions';
import { colors, spacing, textStyles } from '@/theme';

import { IllustrationPlaceholder } from './IllustrationPlaceholder';
import { OnboardingFrame, OnboardingHeading } from './OnboardingFrame';
import { useOnboarding } from './OnboardingProvider';
import { useIllustrationWidth } from './useIllustrationWidth';

const REASONS: readonly { icon: IconName; text: string }[] = [
  { icon: 'tag', text: 'Yeni ilan yayımlandığında' },
  { icon: 'trending-down', text: 'Fiyat veya ilan durumu değiştiğinde' },
  { icon: 'message-circle', text: 'Mesajınıza cevap verildiğinde' },
];

/** 00c — Bildirim izni. Sistem izni YALNIZCA "İzin Ver" düğmesine basınca istenir; ret/atlama ilerlemeyi engellemez. */
export function NotificationsScreen() {
  const router = useRouter();
  const permissions = usePermissions();
  const { complete } = useOnboarding();
  const width = useIllustrationWidth();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const next = () => router.push('/onboarding/location');

  const allow = async () => {
    if (inFlight.current) return; // çift dokunuşta ikinci sistem penceresi açılmaz
    inFlight.current = true;
    setBusy(true);
    try {
      await permissions.requestNotifications();
    } catch {
      // İstek başarısız olsa da akış devam eder (izin isteğe bağlıdır).
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    next();
  };

  return (
    <OnboardingFrame
      step={1}
      testID="onboarding-notifications"
      onSkip={() => void complete()}
      footer={
        <>
          <Btn label="Bildirimlere İzin Ver" icon="bell" loading={busy} onPress={() => void allow()} testID="notifications-allow" />
          <Btn label="Şimdi Değil" variant="onDark" disabled={busy} onPress={next} testID="notifications-later" />
        </>
      }>
      <IllustrationPlaceholder label="illüstrasyon · bildirim" height={200} width={width} />
      <OnboardingHeading eyebrow="BİLDİRİMLER" title="Gelişmeleri kaçırmayın" body="Size yalnızca şu durumlarda bildirim göndeririz:" />
      <View style={styles.reasons}>
        {REASONS.map(({ icon, text }) => (
          <View key={text} style={styles.reason}>
            <View style={styles.reasonIcon}>
              <Icon name={icon} size={20} color={colors.greenBright} />
            </View>
            <Text style={[textStyles.chip, styles.reasonText]}>{text}</Text>
          </View>
        ))}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  reasons: { gap: spacing.lg },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  reasonIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.navyRaised, alignItems: 'center', justifyContent: 'center' },
  reasonText: { flex: 1, color: colors.white, fontSize: 15 },
});
