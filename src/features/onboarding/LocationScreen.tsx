import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Icon } from '@/components/icons/Icon';
import { usePermissions } from '@/permissions';
import { colors, textStyles } from '@/theme';

import { IllustrationPlaceholder } from './IllustrationPlaceholder';
import { OnboardingFrame, OnboardingHeading } from './OnboardingFrame';
import { useOnboarding } from './OnboardingProvider';
import { useIllustrationWidth } from './useIllustrationWidth';

type Choice = { kind: 'later' } | { kind: 'asked'; granted: boolean };

function message(choice: Choice): string {
  if (choice.kind === 'later') return 'Konumu daha sonra açabilirsiniz';
  // Mesaj, saklanmış bir bool'dan değil sistemin döndürdüğü gerçek sonuçtan türer.
  return choice.granted ? 'Konum izni verildi' : 'Konum izni verilmedi. Daha sonra sistem ayarlarından açabilirsiniz';
}

/** 00d — Yalnızca ön plan konum izni (isteğe bağlı). İstek yalnızca düğmeyle yapılır; "Başla" onboarding'i tamamlar. */
export function LocationScreen() {
  const permissions = usePermissions();
  const { complete } = useOnboarding();
  const width = useIllustrationWidth();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const allow = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    let granted = false;
    try {
      granted = (await permissions.requestLocation()).status === 'granted';
    } catch {
      // İstek başarısız olsa da akış devam eder; sonuç "verilmedi" sayılır.
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    setChoice({ kind: 'asked', granted });
  };

  return (
    <OnboardingFrame
      step={2}
      testID="onboarding-location"
      onSkip={() => void complete()}
      footer={
        choice ? (
          <>
            <View style={styles.result} accessibilityLiveRegion="polite" testID="location-result">
              <Icon name="circle-check" size={18} color={colors.greenBright} />
              <Text style={[textStyles.bodySmall, styles.resultText]}>{message(choice)}</Text>
            </View>
            <Btn label="Başla" icon="arrow-right" onPress={() => void complete()} testID="onboarding-start" />
          </>
        ) : (
          <>
            <Btn label="Konuma İzin Ver" icon="map-pin" loading={busy} onPress={() => void allow()} testID="location-allow" />
            <Btn label="Şimdi Değil" variant="onDark" disabled={busy} onPress={() => setChoice({ kind: 'later' })} testID="location-later" />
          </>
        )
      }>
      <IllustrationPlaceholder label="illüstrasyon · konum" height={280} width={width} />
      <OnboardingHeading
        eyebrow="KONUM · İSTEĞE BAĞLI"
        title="Size yakın ilanları önce gösterelim"
        body="Konumunuz yalnızca ilanları size olan uzaklığa göre sıralamak için kullanılır."
      />
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  result: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  resultText: { flex: 1, color: colors.bluePale, textAlign: 'center' },
});
