import { useCallback, useState } from 'react';

/**
 * Aşağı çekip yenileme: gösterge YALNIZ kullanıcı çektiğinde açılır ve verilen yenileme bitince kapanır. `RefreshControl.refreshing`'i
 * sorgunun `isRefetching`'ine bağlamak, odakta/arka planda yapılan her yeniden çekmede (bayat veri, başka ekranın aynı sorguyu bağlaması,
 * önbellek geçersizleştirme) üstte kendiliğinden açılıp kapanan bir gösterge çıkarır; bu kanca onu önler (Mesajlar/Bildirimler deseni).
 */
export function usePullRefresh(refresh: () => Promise<unknown>) {
  const [pulling, setPulling] = useState(false);
  const onRefresh = useCallback(() => {
    setPulling(true);
    void Promise.resolve()
      .then(refresh)
      .catch(() => undefined)
      .finally(() => setPulling(false));
  }, [refresh]);
  return { pulling, onRefresh };
}
