import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

import { useAuthSubmit } from './useAuthSubmit';

/**
 * Çıkış. Sıra: önce servis `signOut()` (kalıcı oturum + kullanıcıya bağlı durum silinir). BAŞARISIZ olursa hiçbir şey
 * değişmez — oturum açık kalır ve `failure` ile açık hata gösterilir (tekrar deneme aynı çağrıdır); hata "oturum yok" gibi yutulmaz.
 * Başarıda: uçuştaki sorgular iptal edilir, UI oturumu `null` yapılır (bekleyen auth işlemlerini ve bekleyen bildirim hedefini
 * geçersiz kılar) ve QueryClient TAMAMEN boşaltılır (`clear`: sorgular — `initialData` dahil — ve mutation önbelleği). `resetQueries`
 * tek başına yetmez: initialData'yı geri yükler, mutation sonuçlarına dokunmaz. Onboarding ve cihaz tercihleri ayrı anahtarlardadır;
 * dokunulmaz.
 */
export function useSignOut() {
  const { auth } = useServices();
  const { setSession } = useSession();
  const queryClient = useQueryClient();
  const { submitting, failure, submit } = useAuthSubmit();

  const signOut = useCallback(
    () =>
      submit(
        () => auth.signOut(),
        () => {
          void queryClient.cancelQueries(); // iptal eşzamanlı başlar; geç gelen yanıt önbelleğe yazılmaz
          setSession(null);
          queryClient.clear();
        },
      ),
    [auth, queryClient, setSession, submit],
  );

  return { signOut, signingOut: submitting, failure };
}
