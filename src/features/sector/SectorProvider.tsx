import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSectorId, type SectorId } from '@/domain';
import { createDeviceStorage } from '@/services/deviceStorage';
import { STORAGE_KEYS } from '@/services/storageKeys';

type SectorContextValue = {
  /** Seçilen sektör; seçilmediyse `null`. */
  readonly sector: SectorId | null;
  readonly setSector: (sector: SectorId | null) => void;
};

const SectorContext = createContext<SectorContextValue | null>(null);

/**
 * Madde 1: kullanıcının seçtiği sektör (tanıtımda ya da ana sayfada). Cihazda tutulur, çıkışta silinmez; ana sayfa buna göre uygun araç
 * türlerini öne çıkarır, araç bulucu ilk adımda önerir. Depo okunamazsa seçim yok sayılır.
 */
export function SectorProvider({ children }: { children: ReactNode }) {
  const [storage] = useState(createDeviceStorage);
  const [sector, setSectorState] = useState<SectorId | null>(null);

  useEffect(() => {
    let active = true;
    storage
      .getItem(STORAGE_KEYS.sector)
      .then((raw) => {
        if (active && isSectorId(raw)) setSectorState((current) => current ?? raw);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [storage]);

  const setSector = useCallback(
    (next: SectorId | null) => {
      setSectorState(next);
      void (next ? storage.setItem(STORAGE_KEYS.sector, next) : storage.removeItem(STORAGE_KEYS.sector)).catch(() => undefined);
    },
    [storage],
  );

  const value = useMemo(() => ({ sector, setSector }), [sector, setSector]);
  return <SectorContext.Provider value={value}>{children}</SectorContext.Provider>;
}

export function useSector(): SectorContextValue {
  const value = useContext(SectorContext);
  if (!value) throw new Error('useSector yalnızca <SectorProvider> içinde kullanılabilir.');
  return value;
}
