import type { NotificationTarget, Session } from '@/domain';

/**
 * Bekleyen bildirim hedefi sözleşmesi (docs/ARCHITECTURE.md: "Pending notification target oturum sonrası işlenir"). Yalnızca
 * BELLEKTE ve TİPLİ tutulur (kalıcı depoya yazılmaz). Hedefin gerçek çözümlenmesi/yönlendirmesi (ilan, sohbet, duyuru ekranları)
 * 015'e aittir; burada yalnızca saklama + tek seferlik tüketme vardır.
 *
 *  - `hold`   : kimlik gerektiren hedefi saklar (son gelen kazanır; tek yuva).
 *  - `consume`: yalnızca oturum VAR ve e-posta DOĞRULANMIŞSA hedefi verir ve siler (tek sefer); aksi halde `null` döner ve hedef kalır.
 *  - `clear`  : oturum bitince çağrılır — önceki kullanıcının hedefi sonraki kullanıcıya geçmez.
 */
export interface PendingTargetStore {
  hold(target: NotificationTarget): void;
  consume(session: Session | null): NotificationTarget | null;
  /** Tüketmeden bekleyen var mı (testler/arayüz için). */
  has(): boolean;
  clear(): void;
}

export function createPendingTargetStore(): PendingTargetStore {
  let pending: NotificationTarget | null = null;
  return {
    hold(target) {
      pending = target;
    },
    consume(session) {
      if (!session || !session.user.emailVerified || pending === null) return null;
      const target = pending;
      pending = null;
      return target;
    },
    has: () => pending !== null,
    clear() {
      pending = null;
    },
  };
}
