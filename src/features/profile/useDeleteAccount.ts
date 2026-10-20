import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuthSubmit } from '@/features/auth/useAuthSubmit';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

/**
 * Hesap silme. Sıra: önce servis `deleteAccount()` (sunucuda hesap + ona bağlı tüm kayıtlar silinir).
 * BAŞARISIZ olursa hiçbir şey değişmez — oturum açık kalır, `failure` ile açık hata gösterilir ve aynı çağrı yeniden denenebilir.
 * Başarıda (çıkıştaki gibi): uçuştaki sorgular iptal edilir, UI oturumu `null` yapılır (bekleyen işlemleri ve bekleyen bildirim hedefini
 * geçersiz kılar) ve QueryClient TAMAMEN boşaltılır (`clear`). Onboarding ve cihaz tercihleri ayrı anahtarlardadır; dokunulmaz. Yönlendirme
 * oturumdan türediği için kullanıcı giriş ekranına döner (onboarding tekrar gösterilmez).
 * İş sürerken oturum bitirilirse (çıkış, başka hesap) `useAuthSubmit` sonucu yok sayar; servis kapısı da başka hesabı silmeyi reddeder.
 */
export function useDeleteAccount() {
  const { profile } = useServices();
  const { setSession } = useSession();
  const queryClient = useQueryClient();
  const { submitting, failure, submit, clearFailure } = useAuthSubmit();

  const deleteAccount = useCallback(
    () =>
      submit(
        () => profile.deleteAccount(),
        () => {
          void queryClient.cancelQueries(); // iptal eşzamanlı başlar; geç gelen yanıt önbelleğe yazılmaz
          setSession(null);
          queryClient.clear();
        },
      ),
    [profile, queryClient, setSession, submit],
  );

  return { deleteAccount, deleting: submitting, failure, clearFailure };
}
