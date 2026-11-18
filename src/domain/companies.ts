import type { IsoDateTime } from './common';
import type { LeadId, UserId } from './ids';
import type { LeadTopic } from './leads';

/**
 * Madde 47: kurumsal müşteri hesabı. Kullanıcı tek bir şirkete üye olur. Roller:
 *  - `owner` (sahip): üyeleri davet eder, rolleri değiştirir, talepleri onaylar
 *  - `approver` (onaylayan): şirket adına talepleri onaylar / reddeder
 *  - `requester` (talep eden): şirket adına talep bırakır; talep onaylanana kadar firmaya iletilmez (madde 51)
 */
export type CompanyRole = 'owner' | 'approver' | 'requester';

export const COMPANY_ROLES: readonly CompanyRole[] = ['owner', 'approver', 'requester'];

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = { owner: 'Sahip', approver: 'Onaylayan', requester: 'Talep eden' };

export const COMPANY_ROLE_HINTS: Record<CompanyRole, string> = {
  owner: 'Üyeleri yönetir, talepleri onaylar',
  approver: 'Şirket adına talepleri onaylar',
  requester: 'Talepleri onaya gönderir',
};

export const isCompanyRole = (value: unknown): value is CompanyRole => typeof value === 'string' && (COMPANY_ROLES as readonly string[]).includes(value);

export type Company = { readonly id: string; readonly name: string; readonly taxNumber: string | null };

export type CompanyMembership = { readonly company: Company; readonly role: CompanyRole };

export type CompanyMember = { readonly userId: UserId; readonly fullName: string; readonly email: string; readonly role: CompanyRole };

export type CompanyInvite = { readonly id: string; readonly companyId: string; readonly companyName: string; readonly email: string; readonly role: CompanyRole };

/** Madde 51: onay bekleyen şirket talebi. */
export type PendingCompanyLead = {
  readonly leadId: LeadId;
  readonly topic: LeadTopic;
  readonly listingTitle: string | null;
  readonly requesterName: string;
  readonly createdAt: IsoDateTime;
};

/** Talebin şirket onay durumu. `not_required`: bireysel ya da sahip/onaylayan tarafından açılmış. */
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export const canApprove = (role: CompanyRole | null | undefined) => role === 'owner' || role === 'approver';
