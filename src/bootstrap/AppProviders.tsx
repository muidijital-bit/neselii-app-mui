import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { createAppQueryClient } from '@/query/queryClient';
import { ServicesProvider, type ServiceContainer } from '@/services';

import { Bootstrap } from './Bootstrap';

type Props = {
  children: ReactNode;
  /**
   * Dışarıdan verilen kap (testler, ileride başka adapter). VERİLİRSE kabın yaşam döngüsü ve `dispose()` SAHİPLİĞİ ÇAĞIRANDADIR
   * (kök kapatmaz). Verilmezse kök kendi kabını üretir ve kapanırken (StrictMode'a dayanıklı biçimde) kendisi `dispose()` eder.
   */
  container?: ServiceContainer;
  bootstrapTimeoutMs?: number;
};

/**
 * Kök sağlayıcı bileşimi (dıştan içe): servis kabı → QueryClient → Bootstrap → uygulama.
 * `SafeAreaProvider` BURADA YOK: Expo Router kökü zaten sağlar (çakışma/çift sağlayıcı olmasın).
 * Kap ve QueryClient `useState` ile bir kez üretilir; yeniden render ve StrictMode aynı canlı örnekleri korur.
 */
export function AppProviders({ children, container, bootstrapTimeoutMs }: Props) {
  const [queryClient] = useState(createAppQueryClient);
  const lifecycle = useRef({ setups: 0 });

  useEffect(() => {
    // Kök kendi ürettiği QueryClient'ın sahibidir: gerçek unmount'ta önbelleği ve bekleyen çöp toplama (gc) zamanlayıcılarını temizler.
    // StrictMode (geliştirme) efektleri setup → cleanup → setup çalıştırır ve AYNI istemciyi korur; hemen temizlemek canlı önbelleği
    // erken boşaltırdı. Bu yüzden temizlik bir mikro görev ertelenir ve aradaki yeniden kurulum onu iptal eder (ServicesProvider ile aynı desen).
    const counter = lifecycle.current; // aynı nesne: temizlikte güncel sayaç okunur
    const setup = ++counter.setups;
    return () => {
      void Promise.resolve().then(() => {
        if (counter.setups === setup) queryClient.clear();
      });
    };
  }, [queryClient]);

  return (
    <ServicesProvider container={container}>
      <QueryClientProvider client={queryClient}>
        <Bootstrap timeoutMs={bootstrapTimeoutMs}>{children}</Bootstrap>
      </QueryClientProvider>
    </ServicesProvider>
  );
}
