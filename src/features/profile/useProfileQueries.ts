import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

/** Anahtara kullanıcı kimliği girer (listings/messaging/notifications ile aynı kural): başka kullanıcının girişinde profil önbelleği paylaşılmaz. */
export const profileKeys = {
  all: (userId: string | null) => ['profile', userId] as const,
  detail: (userId: string | null) => [...profileKeys.all(userId), 'detail'] as const,
};

/**
 * Profil düzenleme ekranının okuması: servisten (`getProfile`) taze profil. Önbellekte tutulmaz (`gcTime: 0`): ekran her açılışta güncel
 * kaydı yükler ve kaydedilmemiş bir eski kopya forma girmez. Form yalnızca ilk yüklemede doldurulur (bkz. `ProfileEditScreen`).
 */
export function useProfileQuery() {
  const { profile } = useServices();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => profile.getProfile(),
    enabled: session?.user.emailVerified === true,
    gcTime: 0,
  });
}
