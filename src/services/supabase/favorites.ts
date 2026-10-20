import { asListingId, type FavoriteEntry, type ListingId, type PageInput } from '@/domain';

import type { FavoritesService } from '../contracts';
import type { Supabase } from './client';
import { SUMMARY_COLUMNS, toListingSummary, type ListingRow } from './mappers';
import { call, offsetOf, pageRange, requireUserId, toIso, toPage, unwrap , ensure } from './shared';

type FavoriteRow = { listing_id: string; created_at: string; listing: ListingRow | null };

/** Favoriler: en son eklenen önce. İlan yayından kalktıysa RLS ilanı gizler → `listing: null` (ekran bunu güvenle gösterir). */
export function createSupabaseFavorites(sb: Supabase): FavoritesService {
  const toEntry = (row: FavoriteRow, now: number): FavoriteEntry => ({
    listingId: asListingId(row.listing_id),
    addedAt: toIso(row.created_at),
    listing: row.listing ? toListingSummary(row.listing, now) : null,
  });

  const fetchOne = async (userId: string, listingId: ListingId) =>
    unwrap(
      await sb.from('favorites').select(`listing_id, created_at, listing:listings(${SUMMARY_COLUMNS})`).eq('user_id', userId).eq('listing_id', listingId).single(),
    ) as unknown as FavoriteRow;

  return {
    list: (input?: PageInput) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const offset = offsetOf(input?.cursor);
        const [from, to] = pageRange(offset);
        const rows = unwrap(
          await sb
            .from('favorites')
            .select(`listing_id, created_at, listing:listings(${SUMMARY_COLUMNS})`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .order('listing_id', { ascending: true })
            .range(from, to),
        ) as unknown as FavoriteRow[];
        const now = Date.now();
        return toPage(rows, offset, (row) => toEntry(row, now));
      }),

    add: (listingId: ListingId) =>
      call(async () => {
        const userId = await requireUserId(sb);
        // İdempotent: zaten favoriyse çakışma yok sayılır ve mevcut kayıt döner.
        ensure(await sb.from('favorites').upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id', ignoreDuplicates: true }));
        return toEntry(await fetchOne(userId, listingId), Date.now());
      }),

    remove: (listingId: ListingId) =>
      call(async () => {
        const userId = await requireUserId(sb);
        ensure(await sb.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId));
      }),
  };
}
