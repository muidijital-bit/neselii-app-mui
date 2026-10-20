import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { appError, userMessage, type NotificationPreferences } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

/** Sorgu kapsamı (diğer oturumlu özelliklerle aynı kural): oturum hazır VE e-posta doğrulanmışken çalışır; anahtara kullanıcı kimliği girer. */
function useQueryScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true, userId: session?.user.id ?? null };
}

export const preferencesKeys = {
  all: (userId: string | null) => ['preferences', userId] as const,
};

/** Hesabın uygulama içi tercihleri (bildirim türleri + "yakındakini önce göster"). Sistem izni burada DEĞİLDİR; o cihazdan okunur. */
export function usePreferencesQuery() {
  const { notifications } = useServices();
  const { enabled, userId } = useQueryScope();
  return useQuery({ queryKey: preferencesKeys.all(userId), queryFn: () => notifications.getPreferences(), enabled });
}

type UpdateVariables = {
  /** Eylemi başlatan kullanıcı: sonuç yalnızca KENDİ önbelleğine yazılır. */
  readonly userId: string;
  readonly patch: Partial<NotificationPreferences>;
  /**
   * Eylem ANINDA (ör. sistem izin penceresi açılmadan önce) `SessionProvider.beginOperation()` ile yakalanan oturum kanıtı. `mutationFn` servis
   * çağrısından hemen önce denetler: kullanıcı izin penceresindeyken çıkış yapılır ya da hesap değişirse eski kullanıcının tercihi yeni kullanıcı
   * adına servise GİTMEZ. Servis guard'ı yalnızca çağrı başladıktan sonraki değişimi yakalar.
   */
  readonly isCurrent: () => boolean;
};

/**
 * Tercih güncelleme (iyimser değil): servis başarılı olunca önbellek servisin döndürdüğü TAM tercihle değişir. Bir güncelleme sürerken yeni
 * dokunuş yok sayılır, böylece sıra dışı yanıt eski değeri geri yazamaz. Hata görünür bir `failure` olur; anahtar eski değerinde kalır.
 */
export function usePreferencesUpdate() {
  const { notifications } = useServices();
  const { userId } = useQueryScope();
  const { beginOperation } = useSession();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);

  const mutation = useMutation<NotificationPreferences, unknown, UpdateVariables>({
    mutationFn: ({ patch, isCurrent }) => {
      if (!isCurrent()) return Promise.reject(appError.unauthenticated());
      return notifications.updatePreferences(patch);
    },
    onSuccess: (next, { userId: owner }) => {
      queryClient.setQueryData(preferencesKeys.all(owner), next);
    },
    onError: (error, { isCurrent }) => {
      // Başka oturumun ekranına eski hesabın hatası yazılmaz.
      if (isCurrent()) setFailure(`Tercih güncellenemedi. ${userMessage(error)}`);
    },
    onSettled: (_data, _error, { userId: owner }) => queryClient.invalidateQueries({ queryKey: preferencesKeys.all(owner) }),
  });

  const { mutateAsync } = mutation;

  /** `isCurrent`: eylem anında yakalanan oturum kanıtı (`beginAction`). Başarısızlık `failure`a yazılır; çağıran için `false` döner. */
  const update = useCallback(
    async (patch: Partial<NotificationPreferences>, isCurrent: () => boolean): Promise<boolean> => {
      if (userId === null) return false;
      setFailure(null);
      try {
        await mutateAsync({ userId, patch, isCurrent });
        return true;
      } catch {
        return false;
      }
    },
    [mutateAsync, userId],
  );

  return {
    update,
    /** Eylem anında çağrılır (izin penceresinden ÖNCE); dönen işlev oturum değiştiyse `false` verir. */
    beginAction: beginOperation,
    pendingPatch: mutation.isPending ? (mutation.variables?.patch ?? null) : null,
    busy: mutation.isPending,
    failure,
    clearFailure: () => setFailure(null),
  };
}
