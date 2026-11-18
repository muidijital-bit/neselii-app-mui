import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { asLeadId, type CompanyRole, type UserId } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

function useScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true, userId: session?.user.id ?? null, email: session?.user.email ?? '' };
}

export const companyKeys = {
  all: (userId: string | null) => ['company', userId] as const,
  membership: (userId: string | null) => ['company', userId, 'membership'] as const,
  members: (userId: string | null) => ['company', userId, 'members'] as const,
  myInvites: (userId: string | null) => ['company', userId, 'my-invites'] as const,
  companyInvites: (userId: string | null, companyId: string) => ['company', userId, 'invites', companyId] as const,
  pending: (userId: string | null) => ['company', userId, 'pending'] as const,
};

/** Kullanıcının şirketi ve rolü (madde 47); üye değilse `null`. */
export function useMembership() {
  const { companies } = useServices();
  const { enabled, userId } = useScope();
  return useQuery({ queryKey: companyKeys.membership(userId), queryFn: () => companies.getMembership(), enabled });
}

export function useCompanyMembers(enabled: boolean) {
  const { companies } = useServices();
  const { userId } = useScope();
  return useQuery({ queryKey: companyKeys.members(userId), queryFn: () => companies.listMembers(), enabled });
}

export function useMyInvites(enabled: boolean) {
  const { companies } = useServices();
  const { userId, email } = useScope();
  return useQuery({ queryKey: companyKeys.myInvites(userId), queryFn: () => companies.listMyInvites(email), enabled: enabled && email !== '' });
}

export function useCompanyInvites(companyId: string | null) {
  const { companies } = useServices();
  const { userId } = useScope();
  return useQuery({ queryKey: companyKeys.companyInvites(userId, companyId ?? ''), queryFn: () => companies.listCompanyInvites(companyId!), enabled: companyId !== null });
}

/** Madde 51: onay bekleyen şirket talepleri (sahip / onaylayan). */
export function usePendingCompanyLeads(enabled: boolean) {
  const { companies } = useServices();
  const { userId } = useScope();
  return useQuery({ queryKey: companyKeys.pending(userId), queryFn: () => companies.listPendingLeads(), enabled });
}

/** Tüm kurumsal hesap işlemleri; başarıda şirket önbelleği ve talepler yenilenir. */
export function useCompanyActions() {
  const { companies } = useServices();
  const { userId } = useScope();
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: companyKeys.all(userId) });
    void queryClient.invalidateQueries({ queryKey: ['leads', userId] });
  };
  return {
    create: useMutation<void, unknown, { name: string; taxNumber: string | null }>({ mutationFn: ({ name, taxNumber }) => companies.create(name, taxNumber), onSuccess: refresh }),
    invite: useMutation<void, unknown, { email: string; role: CompanyRole }>({ mutationFn: ({ email, role }) => companies.invite(email, role), onSuccess: refresh }),
    accept: useMutation<void, unknown, string>({ mutationFn: (id) => companies.acceptInvite(id), onSuccess: refresh }),
    deleteInvite: useMutation<void, unknown, string>({ mutationFn: (id) => companies.deleteInvite(id), onSuccess: refresh }),
    setRole: useMutation<void, unknown, { userId: UserId; role: CompanyRole }>({ mutationFn: ({ userId: id, role }) => companies.setRole(id, role), onSuccess: refresh }),
    remove: useMutation<void, unknown, UserId>({ mutationFn: (id) => companies.removeMember(id), onSuccess: refresh }),
    decide: useMutation<void, unknown, { leadId: string; approve: boolean }>({ mutationFn: ({ leadId, approve }) => companies.decideLead(asLeadId(leadId), approve), onSuccess: refresh }),
  };
}
