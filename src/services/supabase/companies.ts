import {
  appError,
  asLeadId,
  asUserId,
  isCompanyRole,
  isLeadTopic,
  type CompanyInvite,
  type CompanyMembership,
  type CompanyRole,
  type LeadId,
  type UserId,
} from '@/domain';

import type { CompaniesService } from '../contracts';
import type { Supabase } from './client';
import { call, requireUserId, toIso, unwrap, unwrapMaybe } from './shared';

/** Sunucu hata iletilerini kullanıcı alanı hatalarına çevirir (yetki denetimi fonksiyonlarda). */
function mapRpcError(error: unknown): never {
  const message = (error as { message?: string } | null)?.message ?? '';
  if (/already member/.test(message)) throw appError.validation({ company: 'Bu kişi zaten bir şirkete üye.' });
  if (/last owner/.test(message)) throw appError.validation({ company: 'Şirketin en az bir sahibi olmalı.' });
  if (/already decided/.test(message)) throw appError.validation({ company: 'Bu talep için zaten karar verilmiş.' });
  throw error;
}

async function rpc(result: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await result;
  if (error) mapRpcError(error);
}

const toInvite = (row: { id: string; company_id: string; email: string; role: string; company: { name: string } | null }): CompanyInvite => ({
  id: row.id,
  companyId: row.company_id,
  companyName: row.company?.name ?? 'Şirket',
  email: row.email,
  role: isCompanyRole(row.role) ? row.role : 'requester',
});

const INVITE_COLUMNS = 'id, company_id, email, role, company:companies!company_invites_company_id_fkey(name)';

/** Kurumsal hesap (madde 47) ve onay akışı (madde 51): `companies`, `company_members`, `company_invites` + sunucu fonksiyonları. */
export function createSupabaseCompanies(sb: Supabase): CompaniesService {
  return {
    getMembership: () =>
      call(async (): Promise<CompanyMembership | null> => {
        const userId = await requireUserId(sb);
        const row = unwrapMaybe(
          await sb.from('company_members').select('role, company:companies!company_members_company_id_fkey(id, name, tax_number)').eq('user_id', userId).maybeSingle(),
        ) as unknown as { role: string; company: { id: string; name: string; tax_number: string | null } | null } | null;
        if (!row?.company) return null;
        return { company: { id: row.company.id, name: row.company.name, taxNumber: row.company.tax_number }, role: isCompanyRole(row.role) ? row.role : 'requester' };
      }),

    listMyInvites: (email: string) =>
      call(async () => (unwrap(await sb.from('company_invites').select(INVITE_COLUMNS).eq('email', email.trim().toLowerCase())) as unknown as Parameters<typeof toInvite>[0][]).map(toInvite)),

    listCompanyInvites: (companyId: string) =>
      call(async () =>
        (unwrap(await sb.from('company_invites').select(INVITE_COLUMNS).eq('company_id', companyId).order('created_at', { ascending: false })) as unknown as Parameters<typeof toInvite>[0][]).map(toInvite),
      ),

    listMembers: () =>
      call(async () =>
        unwrap(await sb.rpc('list_company_members')).map((row) => ({
          userId: asUserId(row.user_id),
          fullName: row.full_name,
          email: row.email,
          role: isCompanyRole(row.role) ? row.role : 'requester',
        })),
      ),

    create: (name: string, taxNumber: string | null) =>
      call(async () => {
        if (name.trim().length < 2) throw appError.validation({ name: 'Şirket adını girin.' });
        await rpc(sb.rpc('create_company', { p_name: name.trim(), p_tax_number: taxNumber?.trim() || undefined }));
      }),

    invite: (email: string, role: CompanyRole) =>
      call(async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw appError.validation({ email: 'Geçerli bir e-posta girin.' });
        await rpc(sb.rpc('invite_company_member', { p_email: email.trim().toLowerCase(), p_role: role }));
      }),

    acceptInvite: (id: string) => call(() => rpc(sb.rpc('accept_company_invite', { p_invite_id: id }))),
    deleteInvite: (id: string) => call(() => rpc(sb.rpc('delete_company_invite', { p_invite_id: id }))),
    setRole: (userId: UserId, role: CompanyRole) => call(() => rpc(sb.rpc('set_company_member_role', { p_user_id: userId, p_role: role }))),
    removeMember: (userId: UserId) => call(() => rpc(sb.rpc('remove_company_member', { p_user_id: userId }))),

    listPendingLeads: () =>
      call(async () =>
        unwrap(await sb.rpc('list_company_pending_leads')).map((row) => ({
          leadId: asLeadId(row.lead_id),
          topic: isLeadTopic(row.topic) ? row.topic : 'info',
          listingTitle: row.listing_title,
          requesterName: row.requester_name,
          createdAt: toIso(row.created_at),
        })),
      ),

    decideLead: (leadId: LeadId, approve: boolean) => call(() => rpc(sb.rpc('decide_company_lead', { p_lead_id: leadId, p_approve: approve }))),
  };
}
