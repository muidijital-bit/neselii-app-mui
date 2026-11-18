import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appError, asLeadId, type Lead, type LeadStatus } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import type { CreateLeadInput, UpdateLeadInput } from '@/services/contracts';

function useQueryScope() {
  const { session } = useSession();
  return {
    enabled: session?.user.emailVerified === true,
    userId: session?.user.id ?? null,
    isAdmin: session?.user.role === 'admin',
  };
}

/** Anahtara kullanıcı kimliği girer: başka hesabın girişinde talep önbelleği paylaşılmaz. */
export const leadsKeys = {
  all: (userId: string | null) => ['leads', userId] as const,
  list: (userId: string | null, status: LeadStatus | null) => [...leadsKeys.all(userId), 'list', status] as const,
  detail: (userId: string | null, id: string) => [...leadsKeys.all(userId), 'detail', id] as const,
  newCount: (userId: string | null) => [...leadsKeys.all(userId), 'new-count'] as const,
  appointments: (userId: string | null) => [...leadsKeys.all(userId), 'appointments'] as const,
};

/** Talep listesi (en yeni önce). Yönetici tüm talepleri (isteğe bağlı durum süzgeciyle), müşteri yalnız kendi taleplerini görür. */
export function useLeadsQuery(status: LeadStatus | null) {
  const { leads } = useServices();
  const { enabled, userId, isAdmin } = useQueryScope();
  return useInfiniteQuery({
    queryKey: leadsKeys.list(userId, status),
    queryFn: ({ pageParam }) => leads.list({ scope: isAdmin ? 'all' : 'mine', status: status ?? undefined, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

export function useLeadQuery(id: string) {
  const { leads } = useServices();
  const { enabled, userId } = useQueryScope();
  return useQuery({
    queryKey: leadsKeys.detail(userId, id),
    queryFn: () => leads.get(asLeadId(id)),
    enabled: enabled && id !== '',
  });
}

/** Yönetici profil menüsündeki "Talepler" sayacı: "Yeni" durumundaki talepler. Müşteride çalışmaz. */
export function useNewLeadsCount() {
  const { leads } = useServices();
  const { enabled, userId, isAdmin } = useQueryScope();
  return useQuery({ queryKey: leadsKeys.newCount(userId), queryFn: () => leads.countNew(), enabled: enabled && isAdmin });
}

/** Yönetici: bugünden itibaren randevulu talepler (madde 31). */
export function useAppointmentsQuery() {
  const { leads } = useServices();
  const { enabled, userId, isAdmin } = useQueryScope();
  return useQuery({
    queryKey: leadsKeys.appointments(userId),
    queryFn: () => {
      const now = new Date();
      return leads.listAppointments(new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
    },
    enabled: enabled && isAdmin,
  });
}

/** Yeni talep. Oturum eylem anında yakalanır; arada çıkış/hesap değişimi olduysa servis çağrılmaz. */
export function useCreateLead() {
  const { leads } = useServices();
  const { beginOperation } = useSession();
  const { userId } = useQueryScope();
  const queryClient = useQueryClient();
  return useMutation<Lead, unknown, CreateLeadInput>({
    mutationFn: (input) => {
      const isCurrent = beginOperation();
      if (!isCurrent()) throw appError.unauthenticated();
      return leads.create(input);
    },
    onSuccess: (lead) => {
      queryClient.setQueryData(leadsKeys.detail(userId, lead.id), lead);
      return queryClient.invalidateQueries({ queryKey: leadsKeys.all(userId) });
    },
  });
}

/** Madde 33 (yönetici): rezervasyonu onayla (`days` gün) / kaldır. Başarıda talep, listeler ve ilan önbelleği yenilenir. */
export function useReservation(id: string) {
  const { leads } = useServices();
  const { userId } = useQueryScope();
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: leadsKeys.all(userId) });
    void queryClient.invalidateQueries({ queryKey: ['listings', userId] });
  };
  const approve = useMutation<string, unknown, number>({ mutationFn: (days) => leads.approveReservation(asLeadId(id), days), onSuccess: refresh });
  const release = useMutation<void, unknown, void>({ mutationFn: () => leads.releaseReservation(asLeadId(id)), onSuccess: refresh });
  return { approve, release };
}

/** Yönetici: durum / danışman değişikliği. Başarıda detay önbelleği güncellenir, listeler ve sayaç yenilenir. */
export function useUpdateLead(id: string) {
  const { leads } = useServices();
  const { userId } = useQueryScope();
  const queryClient = useQueryClient();
  return useMutation<Lead, unknown, UpdateLeadInput>({
    mutationFn: (patch) => leads.update(asLeadId(id), patch),
    onSuccess: (lead) => {
      queryClient.setQueryData(leadsKeys.detail(userId, lead.id), lead);
      void queryClient.invalidateQueries({ queryKey: [...leadsKeys.all(userId), 'list'] });
      void queryClient.invalidateQueries({ queryKey: leadsKeys.appointments(userId) });
      void queryClient.invalidateQueries({ queryKey: leadsKeys.newCount(userId) });
    },
  });
}
