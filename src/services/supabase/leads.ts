import {
  appError,
  asAdvisorId,
  asLeadId,
  asListingId,
  asUserId,
  isLeadStatus,
  isLeadTimeSlot,
  isLeadTopic,
  isPlausiblePhone,
  parseFinancePlan,
  type Lead,
  type LeadId,
} from '@/domain';

import type { CreateLeadInput, LeadsService, ListLeadsInput, UpdateLeadInput } from '../contracts';
import type { Supabase } from './client';
import type { Json, Tables } from './database.types';
import { call, offsetOf, pageRange, requireUserId, tlToKurus, toIso, toPage, unwrap, unwrapMaybe } from './shared';

type Row = Pick<
  Tables<'leads'>,
  'id' | 'user_id' | 'topic' | 'status' | 'preferred_date' | 'preferred_slot' | 'contact_phone' | 'note' | 'data' | 'created_at' | 'updated_at'
> & {
  advisor: { id: string; full_name: string; phone: string | null; active: boolean } | null;
  listing: { id: string; title: string; listing_no: number; price: number; cover_url: string | null } | null;
  customer: { full_name: string | null } | null;
};

const COLUMNS =
  'id, user_id, topic, status, preferred_date, preferred_slot, contact_phone, note, data, created_at, updated_at, ' +
  'advisor:advisors!leads_advisor_id_fkey(id, full_name, phone, active), ' +
  'listing:listings!leads_listing_id_fkey(id, title, listing_no, price, cover_url), ' +
  'customer:profiles!leads_user_id_fkey(full_name)';

const planOf = (data: Json): ReturnType<typeof parseFinancePlan> =>
  data && typeof data === 'object' && !Array.isArray(data) ? parseFinancePlan((data as Record<string, unknown>).plan) : null;

function toLead(row: Row): Lead {
  return {
    id: asLeadId(row.id),
    topic: isLeadTopic(row.topic) ? row.topic : 'info',
    status: isLeadStatus(row.status) ? row.status : 'new',
    preferredDate: row.preferred_date,
    preferredSlot: isLeadTimeSlot(row.preferred_slot) ? row.preferred_slot : 'any',
    contactPhone: row.contact_phone,
    note: row.note,
    plan: planOf(row.data),
    advisor: row.advisor ? { id: asAdvisorId(row.advisor.id), fullName: row.advisor.full_name, phone: row.advisor.phone, active: row.advisor.active } : null,
    listing: row.listing
      ? {
          id: asListingId(row.listing.id),
          title: row.listing.title,
          listingNumber: String(row.listing.listing_no),
          price: { amountKurus: tlToKurus(row.listing.price), currency: 'TRY' },
          coverImageUri: row.listing.cover_url,
        }
      : null,
    customer: { id: asUserId(row.user_id), fullName: row.customer?.full_name?.trim() || 'Müşteri' },
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/** Talepler: `leads` tablosu; danışman ataması ve bildirimler sunucu tetikleyicilerindedir (`private.prepare_lead`, `notify_*_lead*`). */
export function createSupabaseLeads(sb: Supabase): LeadsService {
  const fetchOne = async (id: string): Promise<Lead> => {
    const row = unwrapMaybe(await sb.from('leads').select(COLUMNS).eq('id', id).maybeSingle()) as unknown as Row | null;
    if (!row) throw appError.notFound(`lead ${id}`);
    return toLead(row);
  };

  return {
    create: (input: CreateLeadInput) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const phone = input.contactPhone.trim();
        if (!isPlausiblePhone(phone)) throw appError.validation({ contactPhone: 'Geçerli bir telefon numarası girin.' });
        const note = input.note?.trim();
        const row = unwrap(
          await sb
            .from('leads')
            .insert({
              user_id: userId,
              listing_id: input.listingId,
              topic: input.topic,
              preferred_date: input.preferredDate,
              preferred_slot: input.preferredSlot,
              contact_phone: phone,
              note: note ? note.slice(0, 1000) : null,
              data: input.plan ? { plan: { ...input.plan } } : {},
            })
            .select(COLUMNS)
            .single(),
        ) as unknown as Row;
        return toLead(row);
      }),

    list: ({ scope, status, cursor }: ListLeadsInput) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const offset = offsetOf(cursor);
        const [from, to] = pageRange(offset);
        let query = sb.from('leads').select(COLUMNS);
        if (scope === 'mine') query = query.eq('user_id', userId);
        if (status) query = query.eq('status', status);
        const rows = unwrap(await query.order('created_at', { ascending: false }).order('id').range(from, to)) as unknown as Row[];
        return toPage(rows, offset, toLead);
      }),

    get: (id: LeadId) => call(() => fetchOne(id)),

    update: (id: LeadId, patch: UpdateLeadInput) =>
      call(async () => {
        const update: { status?: string; advisor_id?: string | null } = {};
        if (patch.status !== undefined) update.status = patch.status;
        if (patch.advisorId !== undefined) update.advisor_id = patch.advisorId;
        if (Object.keys(update).length === 0) return fetchOne(id);
        const row = unwrapMaybe(await sb.from('leads').update(update).eq('id', id).select(COLUMNS).maybeSingle()) as unknown as Row | null;
        if (!row) throw appError.notFound(`lead ${id}`);
        return toLead(row);
      }),

    countNew: () =>
      call(async () => {
        const { count, error } = await sb.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new');
        if (error) throw error;
        return count ?? 0;
      }),
  };
}
