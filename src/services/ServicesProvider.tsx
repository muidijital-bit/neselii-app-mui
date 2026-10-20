import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { createServiceContainer, type ServiceContainer } from './container';
import type { Services } from './contracts';

const ServicesContext = createContext<ServiceContainer | null>(null);

type Props = {
  /** Verilmezse sağlayıcı kendi kabını üretir ve kapanırken temizler; verilirse sahiplik çağırandadır. */
  container?: ServiceContainer;
  children: ReactNode;
};

export function ServicesProvider({ container, children }: Props) {
  const [owned] = useState(() => (container ? null : createServiceContainer()));
  const active = container ?? owned!;
  const lifecycle = useRef({ setups: 0 });

  useEffect(() => {
    if (!owned) return;
    // React StrictMode (geliştirme) efektleri setup → cleanup → setup çalıştırır ve AYNI kabı korur. Kapatma bir mikro görev
    // ertelenir ve aradaki yeniden kurulum (`setups` artar) onu iptal eder; gerçek unmount'ta yeniden kurulum yoktur.
    const counter = lifecycle.current; // aynı nesne: temizlikte güncel sayaç okunur
    const setup = ++counter.setups;
    return () => {
      void Promise.resolve().then(() => {
        if (counter.setups === setup) owned.dispose();
      });
    };
  }, [owned]);

  return <ServicesContext.Provider value={active}>{children}</ServicesContext.Provider>;
}

export function useServiceContainer(): ServiceContainer {
  const container = useContext(ServicesContext);
  if (!container) throw new Error('useServices yalnızca <ServicesProvider> içinde kullanılabilir.');
  return container;
}

export function useServices(): Services {
  return useServiceContainer().services;
}
