import { asListingId, type CallLog, type ListingId, type PageInput } from '@/domain';

import type { CallLogsService } from '../contracts';
import type { Supabase } from './client';
import { call, ensure, offsetOf, pageRange, toIso, toPage, unwrap } from './shared';

type Row = {
  id: string;
  created_at: string;
  listing: { id: string; title: string } | null;
  customer: { full_name: string | null; phone: string | null } | null;
};

const COLUMNS = 'id, created_at, listing:listings!call_logs_listing_id_fkey(id, title), customer:profiles!call_logs_user_id_fkey(full_name, phone)';

const toCallLog = (row: Row): CallLog => ({
  id: row.id,
  listing: row.listing ? { id: asListingId(row.listing.id), title: row.listing.title } : null,
  customer: { fullName: row.customer?.full_name?.trim() || 'Müşteri', phone: row.customer?.phone ?? null },
  createdAt: toIso(row.created_at),
});

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
};

/** Arama kayıtları: `call_logs` (müşteri yazar, yönetici okur). */
export function createSupabaseCallLogs(sb: Supabase): CallLogsService {
  const count = async (build: (q: any) => any): Promise<number> => {
    const { count: value, error } = await build(sb.from('call_logs').select('id', { count: 'exact', head: true }));
    if (error) throw error;
    return value ?? 0;
  };

  return {
    log: (listingId: ListingId | null) =>
      call(async () => {
        const { data } = await sb.auth.getSession();
        const userId = data.session?.user.id;
        if (!userId) return;
        ensure(await sb.from('call_logs').insert({ user_id: userId, listing_id: listingId }));
      }),

    list: (input?: PageInput) =>
      call(async () => {
        const offset = offsetOf(input?.cursor);
        const [from, to] = pageRange(offset);
        const rows = unwrap(await sb.from('call_logs').select(COLUMNS).order('created_at', { ascending: false }).order('id').range(from, to)) as unknown as Row[];
        return toPage(rows, offset, toCallLog);
      }),

    statsForListing: (listingId: ListingId) =>
      call(async () => {
        const [total, last30Days] = await Promise.all([
          count((q) => q.eq('listing_id', listingId)),
          count((q) => q.eq('listing_id', listingId).gte('created_at', daysAgo(30))),
        ]);
        return { total, last30Days };
      }),

    summary: () =>
      call(async () => {
        const [today, last7Days, total] = await Promise.all([
          count((q) => q.gte('created_at', startOfToday())),
          count((q) => q.gte('created_at', daysAgo(7))),
          count((q) => q),
        ]);
        return { today, last7Days, total };
      }),
  };
}
