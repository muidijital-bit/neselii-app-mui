import '@/lib/storage-polyfill';

import { useSyncExternalStore } from 'react';

const ONBOARDING_KEY = 'onboarding-complete';
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

let onboardingComplete = read();

export function completeOnboarding() {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // Depolama yoksa yalnızca bu oturum için geçerli olur
  }
  onboardingComplete = true;
  listeners.forEach((l) => l());
}

/** Yalnızca geliştirme: tanıtım ekranlarını yeniden göstermek için */
export function resetOnboarding() {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Depolama yoksa yalnızca bu oturumda sıfırlanır
  }
  onboardingComplete = false;
  listeners.forEach((l) => l());
}

/** Tanıtım ekranları bir kez gösterilir; hesap silinse de tekrar gösterilmez. */
export function useOnboardingComplete() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => onboardingComplete,
    () => onboardingComplete,
  );
}
