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
  isRevenueRange,
  parseFinancePlan,
  type CorporateInfo,
  type Lead,
  type LeadId,
  type LeadListing,
} from '@/domain';

import type { CreateLeadInput, LeadsService, ListLeadsInput, UpdateLeadInput } from '../contracts';
import type { Supabase } from './client';
import type { Json, Tables } from './database.types';
import { call, ensure, offsetOf, pageRange, requireUserId, tlToKurus, toIso, toPage, unwrap, unwrapMaybe } from './shared';

type Row = Pick<
  Tables<'leads'>,
  'id' | 'user_id' | 'topic' | 'status' | 'preferred_date' | 'preferred_slot' | 'contact_phone' | 'note' | 'data' | 'appointment_at' | 'appointment_location' | 'approval_status' | 'created_at' | 'updated_at'
> & {
  advisor: { id: string; full_name: string; phone: string | null; active: boolean } | null;
  listing: { id: string; title: string; listing_no: number; price: number; cover_url: string | null; reserved_until: string | null; reserved_lead_id: string | null } | null;
  customer: { full_name: string | null } | null;
  company: { id: string; name: string } | null;
};

const COLUMNS =
  'id, user_id, topic, status, preferred_date, preferred_slot, contact_phone, note, data, appointment_at, appointment_location, approval_status, created_at, updated_at, ' +
  'advisor:advisors!leads_advisor_id_fkey(id, full_name, phone, active), ' +
  'listing:listings!leads_listing_id_fkey(id, title, listing_no, price, cover_url, reserved_until, reserved_lead_id), ' +
  'customer:profiles!leads_user_id_fkey(full_name), company:companies!leads_company_id_fkey(id, name)';

const planOf = (data: Json): ReturnType<typeof parseFinancePlan> =>
  data && typeof data === 'object' && !Array.isArray(data) ? parseFinancePlan((data as Record<string, unknown>).plan) : null;

type FleetItem = { id: string; title: string; listingNo: string; priceKurus: number; coverUrl: string | null };

/** Madde 44: toplu teklifteki ilanların talep anındaki özeti (`data.fleet`). */
function fleetOf(data: Json): LeadListing[] {
  const fleet = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>).fleet : null;
  if (!Array.isArray(fleet)) return [];
  return fleet.flatMap((item): LeadListing[] => {
    const f = item as Partial<FleetItem>;
    if (typeof f.id !== 'string' || typeof f.title !== 'string') return [];
    return [
      {
        id: asListingId(f.id),
        title: f.title,
        listingNumber: String(f.listingNo ?? ''),
        price: { amountKurus: typeof f.priceKurus === 'number' ? f.priceKurus : 0, currency: 'TRY' },
        coverImageUri: typeof f.coverUrl === 'string' ? f.coverUrl : null,
      },
    ];
  });
}

/** Madde 21: talebin `data.corporate` alanı. */
function corporateOf(data: Json): CorporateInfo | null {
  const raw = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>).corporate : null;
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.companyName !== 'string' || !c.companyName.trim()) return null;
  const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  return {
    companyName: c.companyName,
    foundedYear: int(c.foundedYear),
    activity: typeof c.activity === 'string' ? c.activity : null,
    revenueRange: isRevenueRange(c.revenueRange) ? c.revenueRange : null,
    vehicleCount: int(c.vehicleCount),
    plannedDownPaymentKurus: int(c.plannedDownPaymentKurus),
  };
}

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
    fleetListings: fleetOf(row.data),
    corporate: corporateOf(row.data),
    company: row.company ? { id: row.company.id, name: row.company.name } : null,
    approvalStatus: row.approval_status === 'pending' || row.approval_status === 'approved' || row.approval_status === 'rejected' ? row.approval_status : 'not_required',
    reservedUntil: row.listing?.reserved_lead_id === row.id && row.listing.reserved_until ? toIso(row.listing.reserved_until) : null,
    appointmentAt: row.appointment_at ? toIso(row.appointment_at) : null,
    appointmentLocation: row.appointment_location,
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
        let fleet: FleetItem[] | undefined;
        if (input.fleetListingIds?.length) {
          const rows = unwrap(await sb.from('listings').select('id, title, listing_no, price, cover_url').in('id', [...input.fleetListingIds].slice(0, 3)));
          fleet = rows.map((l) => ({ id: l.id, title: l.title, listingNo: String(l.listing_no), priceKurus: tlToKurus(l.price), coverUrl: l.cover_url }));
        }
        const data: Record<string, Json> = {};
        if (input.plan) data.plan = { ...input.plan };
        if (fleet) data.fleet = fleet;
        if (input.corporate?.companyName.trim()) data.corporate = { ...input.corporate, companyName: input.corporate.companyName.trim().slice(0, 120) };
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
              company_id: input.companyId ?? null,
              data,
            })
            .select(COLUMNS)
            .single(),
        ) as unknown as Row;
        return toLead(row);
      }),

    list: ({ scope, status, topics, cursor }: ListLeadsInput) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const offset = offsetOf(cursor);
        const [from, to] = pageRange(offset);
        let query = sb.from('leads').select(COLUMNS);
        if (scope === 'mine') query = query.eq('user_id', userId);
        if (status) query = query.eq('status', status);
        if (topics?.length) query = query.in('topic', [...topics]);
        const rows = unwrap(await query.order('created_at', { ascending: false }).order('id').range(from, to)) as unknown as Row[];
        return toPage(rows, offset, toLead);
      }),

    get: (id: LeadId) => call(() => fetchOne(id)),

    update: (id: LeadId, patch: UpdateLeadInput) =>
      call(async () => {
        const update: { status?: string; advisor_id?: string | null; appointment_at?: string | null; appointment_location?: string | null } = {};
        if (patch.status !== undefined) update.status = patch.status;
        if (patch.advisorId !== undefined) update.advisor_id = patch.advisorId;
        if (patch.appointmentAt !== undefined) update.appointment_at = patch.appointmentAt;
        if (patch.appointmentLocation !== undefined) update.appointment_location = patch.appointmentLocation?.trim().slice(0, 120) || null;
        if (Object.keys(update).length === 0) return fetchOne(id);
        const row = unwrapMaybe(await sb.from('leads').update(update).eq('id', id).select(COLUMNS).maybeSingle()) as unknown as Row | null;
        if (!row) throw appError.notFound(`lead ${id}`);
        return toLead(row);
      }),

    listAppointments: (from: string) =>
      call(async () => {
        const rows = unwrap(
          await sb.from('leads').select(COLUMNS).not('appointment_at', 'is', null).gte('appointment_at', from).order('appointment_at').limit(200),
        ) as unknown as Row[];
        return rows.map(toLead);
      }),

    approveReservation: (id: LeadId, days: number) =>
      call(async () => {
        const result = await sb.rpc('approve_reservation', { p_lead_id: id, p_days: Math.round(days) });
        const message = (result.error as { message?: string } | null)?.message ?? '';
        if (/already reserved/.test(message)) throw appError.validation({ reservation: 'Bu ilan başka bir talep için zaten rezerve.' });
        if (/not available/.test(message)) throw appError.validation({ reservation: 'İlan yayında olmadığı için rezerve edilemez.' });
        return String(unwrap(result));
      }),

    releaseReservation: (id: LeadId) =>
      call(async () => {
        ensure(await sb.rpc('release_reservation', { p_lead_id: id }));
      }),

    countNew: () =>
      call(async () => {
        const { count, error } = await sb.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new');
        if (error) throw error;
        return count ?? 0;
      }),
  };
}
