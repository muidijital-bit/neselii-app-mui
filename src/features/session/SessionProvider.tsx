import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Session } from '@/domain';

import { createPendingTargetStore, type PendingTargetStore } from './pendingTarget';

type SessionContextValue = {
  /** Geçerli oturum; `null` = oturum yok. İlk değer bootstrap sonucundan gelir (hydrate + getSession tamamlanmıştır). */
  readonly session: Session | null;
  /**
   * Giriş/kayıt/çıkış/hesap silme sonrası çağrılır; yönlendirme bu durumdan türer. `null` yapmak ya da kullanıcıyı değiştirmek (A → B)
   * oturumu bitirir: bekleyen işlemleri geçersiz kılar (`beginOperation`) ve bekleyen bildirim hedefini siler.
   */
  readonly setSession: (session: Session | null) => void;
  /**
   * Oturumu değiştirebilecek bir işlem (giriş, kayıt, doğrulama…) BAŞLAMADAN çağrılır. Dönen işlev, işlem sürerken oturum
   * bitirildiyse (çıkış, hesap silme, veri sıfırlama) `false` verir: geç gelen sonuç eski oturumu geri kuramaz.
   */
  readonly beginOperation: () => () => boolean;
  /** Bildirim hedefi için bellek içi bekleme yuvası (bkz. `pendingTarget.ts`). */
  readonly pendingTarget: PendingTargetStore;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/** `<Bootstrap>` içinde kullanılır: ilk oturum bootstrap sonucundan alınır, servis çağrısı yapılmaz. */
export function SessionProvider({ initialSession, children }: { initialSession: Session | null; children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(initialSession);
  const epoch = useRef(0);
  const currentUserId = useRef<string | null>(initialSession?.user.id ?? null);
  const [pendingTarget] = useState(createPendingTargetStore);

  const setSession = useCallback(
    (next: Session | null) => {
      const nextUserId = next?.user.id ?? null;
      const userChanged = currentUserId.current !== null && nextUserId !== currentUserId.current;
      if (next === null || userChanged) {
        // Oturum bitti ya da kullanıcı değişti (A → B): uçuştaki işlemlerin sonucu artık geçersiz (render beklenmeden, eşzamanlı)
        // ve önceki kullanıcının bekleyen hedefi sonrakine geçmez. null → kullanıcı (giriş) bunu tetiklemez: bekleyen hedef giriş sonrası açılır.
        epoch.current += 1;
        pendingTarget.clear();
      }
      currentUserId.current = nextUserId;
      setSessionState(next);
    },
    [pendingTarget],
  );

  const beginOperation = useCallback(() => {
    const started = epoch.current;
    return () => epoch.current === started;
  }, []);

  const value = useMemo(() => ({ session, setSession, beginOperation, pendingTarget }), [session, setSession, beginOperation, pendingTarget]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession yalnızca <SessionProvider> içinde kullanılabilir.');
  return value;
}
