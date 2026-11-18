import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { asAdvisorId, type Advisor } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import type { SaveAdvisorInput } from '@/services/contracts';

function useScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true && session.user.role === 'admin', userId: session?.user.id ?? null };
}

export const advisorsKeys = {
  all: (userId: string | null) => ['advisors', userId] as const,
  list: (userId: string | null, includeInactive: boolean) => [...advisorsKeys.all(userId), 'list', includeInactive] as const,
  detail: (userId: string | null, id: string) => [...advisorsKeys.all(userId), 'detail', id] as const,
};

/** Yönetici: danışmanlar. `includeInactive` yönetim ekranında pasifleri de getirir; talep atamasında yalnız aktifler listelenir. */
export function useAdvisorsQuery(includeInactive = false) {
  const { advisors } = useServices();
  const { enabled, userId } = useScope();
  return useQuery({
    queryKey: advisorsKeys.list(userId, includeInactive),
    queryFn: () => advisors.list({ includeInactive }),
    enabled,
  });
}

export function useAdvisorQuery(id: string) {
  const { advisors } = useServices();
  const { enabled, userId } = useScope();
  return useQuery({ queryKey: advisorsKeys.detail(userId, id), queryFn: () => advisors.get(asAdvisorId(id)), enabled: enabled && id !== '', gcTime: 0 });
}

/** Danışman kaydet (`id` yoksa yeni) / sil. Başarıda danışman listeleri ve talepler (danışman adı görünür) yenilenir. */
export function useAdvisorMutations() {
  const { advisors } = useServices();
  const { userId } = useScope();
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: advisorsKeys.all(userId) });
    void queryClient.invalidateQueries({ queryKey: ['leads', userId] });
  };
  const save = useMutation<Advisor, unknown, { id: string | null; input: SaveAdvisorInput }>({
    mutationFn: ({ id, input }) => (id ? advisors.update(asAdvisorId(id), input) : advisors.create(input)),
    onSuccess: refresh,
  });
  const remove = useMutation<void, unknown, string>({
    mutationFn: (id) => advisors.remove(asAdvisorId(id)),
    onSuccess: refresh,
  });
  return { save, remove };
}
