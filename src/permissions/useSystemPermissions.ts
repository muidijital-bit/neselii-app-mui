import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { usePermissions } from './PermissionsProvider';
import type { PermissionState } from './types';

export type PermissionKind = 'notifications' | 'location';

type Snapshot = {
  /** `null`: henüz okunmadı ya da sistemden okunamadı — "izin verilmiş" SAYILMAZ. */
  readonly notifications: PermissionState | null;
  readonly location: PermissionState | null;
};

const ALL_KINDS: readonly PermissionKind[] = ['notifications', 'location'];

const UNKNOWN: Snapshot = { notifications: null, location: null };

/**
 * Sistem izin durumunun tek canlı görünümü (018). Durum her zaman sistemden okunur ve saklanmaz: ekran açılırken, uygulama ön plana döndüğünde
 * (kullanıcı sistem ayarlarından izni değiştirmiş olabilir) ve her `request` sonucunda yenilenir. Okuma başarısız olursa o izin `null` kalır
 * ve çağıranlar onu "verilmedi" gibi davranır (anahtar açık görünmez). İzin PENCERESİ yalnızca `request` ile, kullanıcı eylemiyle açılır.
 *
 * Yenileme tetikleyicileri: ekran odağa GELDİĞİNDE (ilk açılış ve başka ekrandan — ör. tercihlerden — dönüş; yığında bağlı kalan ekran, izin başka ekranda
 * değiştiyse eski durumda kalmaz; Android'de izin penceresi arka plan/ön plan çevrimi üretmeyebilir) ve odaktayken uygulama ön plana döndüğünde. Odakta
 * olmayan (gizli) ekran hiçbir şey okumaz. Sürekli yoklama yoktur. `generation` her tetikleyicide artar: koordinat gibi izne bağlı işler tek kontrollü
 * yeniden deneme için bunu kullanır.
 *
 * `kinds`: yalnızca ihtiyaç duyulan izinler okunur (sonuç ekranı yalnız konumu okur; bildirim modülü yüklenmez). Dizi kararlı olmalıdır.
 *
 * Yarış koruması: her okuma/istek bir sıra numarası alır; eski bir okumanın geç gelen sonucu yeni durumu ezmez ve unmount sonrası yazılmaz.
 */
export function useSystemPermissions(kinds: readonly PermissionKind[] = ALL_KINDS) {
  const adapter = usePermissions();
  const [snapshot, setSnapshot] = useState<Snapshot>(UNKNOWN);
  const [loaded, setLoaded] = useState(false);
  const [generation, setGeneration] = useState(0);
  const focused = useIsFocused();
  const sequence = useRef({ notifications: 0, location: 0 });
  const mounted = useRef(true);
  const inFlightRequest = useRef<Record<PermissionKind, boolean>>({ notifications: false, location: false });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const apply = useCallback((kind: PermissionKind, ticket: number, next: PermissionState | null) => {
    if (!mounted.current || sequence.current[kind] !== ticket) return;
    setSnapshot((current) => ({ ...current, [kind]: next }));
  }, []);

  const read = useCallback(
    async (kind: PermissionKind) => {
      const ticket = ++sequence.current[kind];
      try {
        apply(kind, ticket, await (kind === 'notifications' ? adapter.getNotificationState() : adapter.getLocationState()));
      } catch {
        apply(kind, ticket, null);
      }
    },
    [adapter, apply],
  );

  const refresh = useCallback(async () => {
    await Promise.all(kinds.map((kind) => read(kind)));
    if (mounted.current) setLoaded(true);
  }, [kinds, read]);

  useEffect(() => {
    if (!focused) return;
    const trigger = () => {
      setGeneration((current) => current + 1);
      void refresh();
    };
    trigger();
    // Sistem ayarlarından dönüş: durum yeniden okunur (verilmişse açılır, geri alınmışsa kapanır).
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') trigger();
    });
    return () => subscription.remove();
  }, [focused, refresh]);

  /** Kullanıcı eylemiyle sistem izin penceresini açar; sonuç sistemin döndürdüğü gerçek durumdur. Aynı izin için sürerken ikinci istek yok sayılır (`null`). */
  const request = useCallback(
    async (kind: PermissionKind): Promise<PermissionState | null> => {
      if (inFlightRequest.current[kind]) return null;
      inFlightRequest.current[kind] = true;
      const ticket = ++sequence.current[kind];
      try {
        const result = await (kind === 'notifications' ? adapter.requestNotifications() : adapter.requestLocation());
        apply(kind, ticket, result);
        return result;
      } catch {
        // İstek başarısız: gerçek durumu yeniden oku; sonuç yine "verildi" sayılmaz.
        await read(kind);
        return null;
      } finally {
        inFlightRequest.current[kind] = false;
      }
    },
    [adapter, apply, read],
  );

  return { ...snapshot, loaded, focused, generation, refresh, request };
}
