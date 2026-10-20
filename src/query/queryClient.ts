import { QueryClient } from '@tanstack/react-query';

/**
 * Uygulamanın TEK async veri önbelleği (docs/ARCHITECTURE.md). Kök sağlayıcı bir kez üretir (`useState`) ve render/StrictMode
 * boyunca aynı örneği korur. Varsayılanlar bilinçlidir:
 *  - `retry: false` — otomatik yeniden deneme yok; ekranlar kullanıcı eylemiyle (`refetch`) yeniden dener, hata görünürdür
 *    (gizli arka plan denemeleri geliştirme menüsündeki "hata/çevrimdışı" senaryolarını geciktirir).
 *  - `networkMode: 'always'` — mock servislerin ağı yok; React Query'nin "çevrimdışı → duraklat" davranışı devreye girmesin.
 *  - Pencere odağına/yeniden bağlanmaya göre otomatik yenileme yok (React Native'de anlamsız).
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always', refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: 30_000 },
      mutations: { retry: false, networkMode: 'always' },
    },
  });
}
