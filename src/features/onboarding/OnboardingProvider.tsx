import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { BootstrapLoading } from '@/bootstrap';
import { createDeviceStorage } from '@/services';

import { clearOnboardingCompleted, readOnboardingCompleted, writeOnboardingCompleted, type OnboardingStorage } from './onboardingStorage';

type OnboardingContextValue = {
  readonly completed: boolean;
  /** Kalıcı olarak "tamamlandı" yazar (yazma bitince durum değişir) ve yönlendirmeyi tetikler. Tekrar çağrı zararsızdır. */
  readonly complete: () => Promise<void>;
  /**
   * Test aracı (profildeki "Tanıtımı yeniden göster"): kalıcı bayrağı siler ve durumu "tamamlanmadı" yapar. Oturum KAPANMAZ; yönlendirme
   * (`RootNavigator`) tanıtımı açar, tanıtım bitince (`complete`) oturum açık olduğundan doğrudan sekmelere (ana sayfa) döner.
   */
  readonly reset: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

type Props = { children: ReactNode; storage?: OnboardingStorage };

/**
 * Onboarding durumunu cihaz depolamasından okur; okuma bitene kadar çocuk render ETMEZ (yönlendirme yanlış ekranı bir an bile
 * göstermesin). Okuma hatası "tamamlanmadı" sayılır: en kötü sonuç onboarding'in bir kez daha görünmesidir, uygulama açılır.
 */
export function OnboardingProvider({ children, storage }: Props) {
  const [defaultStorage] = useState(() => storage ?? createDeviceStorage());
  const store = storage ?? defaultStorage;
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    readOnboardingCompleted(store).then(
      (value) => !cancelled && setCompleted(value),
      () => !cancelled && setCompleted(false),
    );
    return () => {
      cancelled = true;
    };
  }, [store]);

  const complete = useCallback(async () => {
    try {
      await writeOnboardingCompleted(store);
    } catch {
      // Yazılamazsa bu oturumda yine de ilerlenir (kullanıcı engellenmez); sonraki açılışta onboarding bir kez daha görünebilir.
    }
    setCompleted(true);
  }, [store]);

  const reset = useCallback(async () => {
    try {
      await clearOnboardingCompleted(store);
    } catch {
      // Silinemezse yalnız bu oturumda yeniden gösterilir (sonraki açılışta eski "tamamlandı" değeri okunur); test aracı için yeterli.
    }
    setCompleted(false);
  }, [store]);

  const value = useMemo(() => ({ completed: completed === true, complete, reset }), [completed, complete, reset]);

  if (completed === null) return <BootstrapLoading />;
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding yalnızca <OnboardingProvider> içinde kullanılabilir.');
  return value;
}
