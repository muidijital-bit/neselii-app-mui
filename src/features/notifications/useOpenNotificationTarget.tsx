import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { useSession } from '@/features/session/SessionProvider';

import { NOTIFICATION_UNAVAILABLE_HREF } from './routes';
import { resolveNotificationTarget } from './targets';

/**
 * Bildirim hedefini açar: geçerliyse ilan/sohbet/duyuru rotasına gider, geçersizse güvenli "ulaşılamıyor" ekranını açar. Hedef ekranlar
 * ayrıca kimliğin varlığını/sahipliğini denetler ("bulunamadı"); bu hook hiçbir koşulda istisna fırlatmaz.
 */
export function useOpenNotificationTarget() {
  const router = useRouter();
  return useCallback(
    (input: unknown) => {
      const resolution = resolveNotificationTarget(input);
      router.push(resolution.status === 'ok' ? resolution.href : NOTIFICATION_UNAVAILABLE_HREF);
    },
    [router],
  );
}

/**
 * Bekleyen (oturum açılmadan gelen) hedefi işler: oturum VAR ve e-posta DOĞRULANMIŞ olunca tek sefer tüketir ve açar. Doğrulanmamış
 * kullanıcıda hedef bekler (doğrulama sonrası açılır); çıkışta `SessionProvider` hedefi siler. Gezinme, korumalı grupların yeni oturumla
 * ağaca girmesinden sonraya ertelenir (sıfır süreli zamanlayıcı); oturum arada değişirse iptal edilir ve hedef bekler.
 * Hiçbir şey çizmez; `RootNavigator` içinde bir kez bağlanır.
 */
export function PendingTargetConsumer() {
  const { session, pendingTarget } = useSession();
  const open = useOpenNotificationTarget();
  const verified = session?.user.emailVerified === true;

  useEffect(() => {
    if (!verified || !pendingTarget.has()) return;
    const timer = setTimeout(() => {
      const target = pendingTarget.consume(session);
      if (target) open(target);
    }, 0);
    return () => clearTimeout(timer);
  }, [verified, session, pendingTarget, open]);

  return null;
}
