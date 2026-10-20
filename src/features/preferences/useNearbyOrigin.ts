import { useEffect, useRef, useState } from 'react';

import { resolveNearbyOrder, type Coordinates, type NearbyOrder } from '@/domain';
import { usePermissions, useSystemPermissions } from '@/permissions';

import { usePreferencesQuery } from './usePreferences';

/** Konum servisi yanıt vermezse (kapalı GPS, uzun soğuk başlangıç) beklemeden en yeni sıraya düşülür. */
export const LOCATION_TIMEOUT_MS = 8000;

const LOCATION_ONLY = ['location'] as const;

export type NearbyOrigin = {
  /** `nearest`: koordinatla yakınlık sırası; `fallback`: tercih açık ama izin/koordinat yok (en yeni + açıklama); `off`: tercih kapalı. */
  readonly mode: NearbyOrder;
  /** Sıra henüz belli değil (tercih/izin okunuyor ya da koordinat bekleniyor): ekran sıralı listeyi hazırlarken bekler. */
  readonly locating: boolean;
  /** Cihaz koordinatı — YALNIZCA bellekte; saklanmaz, servise/ağa gönderilmez, sorgu anahtarına girmez. */
  readonly origin: Coordinates | null;
};

/**
 * Yakınlık sırası girdisi (018): kullanıcı tercihi (`nearbyFirst`) + sistem konum izni (her ön plana dönüşte yeniden okunur) + cihaz koordinatı.
 * Koordinat yalnızca tercih AÇIK ve izin VERİLMİŞSE, tek seferlik okunur; izin yoksa/reddedildiyse ya da koordinat alınamadıysa `null` kalır ve
 * mod `fallback` olur (en yeni + açıklama). İzin verilmiş olsa bile ilk okuma null/hata/zaman aşımı olursa, ekran odağa ya da uygulama ön plana
 * her döndüğünde (izin okuması yenilendiğinde) koordinat yokken tek yeni deneme yapılır; denemeler numaralıdır, eski denemenin geç sonucu yenisini ezmez.
 * İzin geri alınınca ya da tercih kapanınca koordinat bellekten silinir.
 * `enabled=false` (ör. kullanıcı fiyat sırasını seçti): yakınlık sırası uygulanmaz ve koordinat HİÇ okunmaz.
 */
export function useNearbyOrigin(enabled = true): NearbyOrigin {
  const adapter = usePermissions();
  const preferences = usePreferencesQuery();
  const { location, loaded, focused, generation } = useSystemPermissions(LOCATION_ONLY);
  const preferred = enabled && preferences.data?.nearbyFirst === true;
  const permissionGranted = location?.status === 'granted';
  const wanted = preferred && permissionGranted;

  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [settled, setSettled] = useState(false);
  const attempt = useRef(0);
  const originRef = useRef<Coordinates | null>(null);
  originRef.current = origin;
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

  useEffect(() => {
    const ticket = ++attempt.current; // önceki denemenin geç sonucu bu numarayla elenir
    if (!wanted) {
      setOrigin(null);
      setSettled(false);
      return;
    }
    // Gizli ekran konum işi başlatmaz; odağa dönüşte `generation` artar (izin hook'u odakta tetikler) ve bu etki TEK kez yeniden değerlendirilir.
    // Koordinat zaten varsa yenisi istenmez (liste yerinde kalır).
    if (!focusedRef.current || originRef.current !== null) return;
    let done = false;
    const finish = (next: Coordinates | null) => {
      if (done || attempt.current !== ticket) return;
      done = true;
      setOrigin(next);
      setSettled(true);
    };
    const timer = setTimeout(() => finish(null), LOCATION_TIMEOUT_MS);
    adapter.getCurrentCoordinates().then(finish, () => finish(null));
    return () => {
      done = true;
      clearTimeout(timer);
    };
    // `generation`: odağa dönüş / ön plana dönüş başına TEK kontrollü yeniden deneme (yalnız koordinat yokken); sürekli yoklama yok.
  }, [adapter, wanted, generation]);

  const preferencesPending = enabled && preferences.isPending && preferences.fetchStatus !== 'idle';
  const mode = resolveNearbyOrder({ preferred, permissionGranted, origin: wanted ? origin : null });
  const locating = preferencesPending || (preferred && !loaded) || (wanted && !settled);
  return { mode, locating, origin: wanted ? origin : null };
}
