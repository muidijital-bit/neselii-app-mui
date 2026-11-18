import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createDeviceStorage } from '@/services/deviceStorage';
import { STORAGE_KEYS } from '@/services/storageKeys';

/** Aynı anda karşılaştırılabilecek en çok ilan (madde 4). */
export const MAX_COMPARE = 3;

export type CompareToggleResult = 'added' | 'removed' | 'full';

type CompareContextValue = {
  readonly ids: readonly string[];
  readonly has: (id: string) => boolean;
  readonly toggle: (id: string) => CompareToggleResult;
  readonly remove: (id: string) => void;
  readonly clear: () => void;
};

const CompareContext = createContext<CompareContextValue | null>(null);

const parseIds = (raw: string | null): string[] => {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
};

/**
 * Karşılaştırma listesi: cihazda tutulur (üyelikten bağımsız; çıkışta silinmez). İlan detayı ekler/çıkarır, sonuç ekranı ve detay "Karşılaştır (n)"
 * çubuğunu gösterir, karşılaştırma ekranı tabloyu çizer. Depo okunamazsa liste boş başlar.
 */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [storage] = useState(createDeviceStorage);
  const [ids, setIds] = useState<readonly string[]>([]);

  useEffect(() => {
    let active = true;
    storage
      .getItem(STORAGE_KEYS.compare)
      .then((raw) => {
        if (!active) return;
        // Yükleme sürerken eklenen kimlikler korunur.
        setIds((current) => Array.from(new Set([...parseIds(raw), ...current])).slice(0, MAX_COMPARE));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [storage]);

  const persist = useCallback((next: readonly string[]) => void storage.setItem(STORAGE_KEYS.compare, JSON.stringify(next)).catch(() => undefined), [storage]);

  const update = useCallback(
    (next: readonly string[]) => {
      setIds(next);
      persist(next);
    },
    [persist],
  );

  const value = useMemo((): CompareContextValue => {
    const has = (id: string) => ids.includes(id);
    return {
      ids,
      has,
      toggle: (id) => {
        if (has(id)) {
          update(ids.filter((current) => current !== id));
          return 'removed';
        }
        if (ids.length >= MAX_COMPARE) return 'full';
        update([...ids, id]);
        return 'added';
      },
      remove: (id) => update(ids.filter((current) => current !== id)),
      clear: () => update([]),
    };
  }, [ids, update]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const value = useContext(CompareContext);
  if (!value) throw new Error('useCompare yalnızca <CompareProvider> içinde kullanılabilir.');
  return value;
}
