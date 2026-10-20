import type { Services } from './contracts';
import { createSupabaseServices, disposeSupabase } from './supabase';

/**
 * ADAPTER SEÇİMİ BURADA, TEK NOKTADA. UI ve özellik kodu `@/services/supabase`'i içe aktarmaz; servislere `useServices()` ile ulaşır.
 * Sözleşmeler (`contracts.ts`) adapter'dan bağımsızdır.
 */
export type AdapterName = 'supabase';

export interface ServiceContainer {
  readonly adapter: AdapterName;
  readonly services: Services;
  /** Açılış hazırlığı. Supabase istemcisi oturumu kendi depolamasından okur; ek iş yoktur (`'none'`). */
  initialize(): Promise<'restored' | 'initial' | 'none'>;
  /** Realtime kanallarını kapatır. Sağlayıcı kapanırken çağrılır. */
  dispose(): void;
}

export type CreateServiceContainerOptions = Record<string, never>;

export function createServiceContainer(): ServiceContainer {
  return {
    adapter: 'supabase',
    services: createSupabaseServices(),
    initialize: async () => 'none',
    dispose: disposeSupabase,
  };
}
