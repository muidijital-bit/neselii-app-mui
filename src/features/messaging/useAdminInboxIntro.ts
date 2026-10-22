import { useCallback, useEffect, useState } from 'react';

import { useIsAdmin } from '@/features/session/useIsAdmin';
import { useSession } from '@/features/session/SessionProvider';
import { createDeviceStorage, STORAGE_KEYS } from '@/services';

const SEEN = '1';

/**
 * Yönetici Mesajlar sekmesini ilk açtığında bir kez gösterilen tanıtım. "Görüldü" bilgisi cihazda kullanıcı kimliğiyle saklanır:
 * aynı cihazda başka bir yönetici girerse o da bir kez görür; müşteride hiç gösterilmez. Okuma hatası "görülmedi" sayılır.
 */
export function useAdminInboxIntro(): { visible: boolean; dismiss: () => void } {
  const isAdmin = useIsAdmin();
  const userId = useSession().session?.user.id ?? null;
  const [storage] = useState(createDeviceStorage);
  const [visible, setVisible] = useState(false);
  const key = isAdmin && userId ? `${STORAGE_KEYS.adminInboxIntroPrefix}${userId}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    storage.getItem(key).then(
      (value) => !cancelled && setVisible(value !== SEEN),
      () => !cancelled && setVisible(true),
    );
    return () => {
      cancelled = true;
    };
  }, [key, storage]);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Yazılamazsa bu oturumda yine kapanır; sonraki açılışta bir kez daha görünebilir.
    if (key) storage.setItem(key, SEEN).catch(() => undefined);
  }, [key, storage]);

  return { visible: visible && key !== null, dismiss };
}
