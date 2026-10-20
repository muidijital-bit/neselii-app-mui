import { useRouter } from 'expo-router';

import { Btn } from '@/components/Btn';

import { IllustrationPlaceholder } from './IllustrationPlaceholder';
import { OnboardingFrame, OnboardingHeading } from './OnboardingFrame';
import { useOnboarding } from './OnboardingProvider';
import { useIllustrationWidth } from './useIllustrationWidth';

/** 00b — Tanıtım. */
export function IntroScreen() {
  const router = useRouter();
  const { complete } = useOnboarding();
  const width = useIllustrationWidth();

  return (
    <OnboardingFrame
      step={0}
      testID="onboarding-intro"
      onSkip={() => void complete()}
      footer={<Btn label="Devam" onPress={() => router.push('/onboarding/notifications')} testID="onboarding-continue" />}>
      <IllustrationPlaceholder label="illüstrasyon · filo" height={280} width={width} />
      <OnboardingHeading eyebrow="HOŞ GELDİNİZ" title="Firmamızın filosundan kamyon, çekici, dorse, otomobil ve iş makinesi ilanları" />
    </OnboardingFrame>
  );
}
