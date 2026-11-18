import { MAX_PACKAGE_LISTINGS, appError, isSectorId, type VehiclePackage, type VehiclePackageInput } from '@/domain';

import type { PackagesService } from '../contracts';
import type { Supabase } from './client';
import { SUMMARY_COLUMNS, toListingSummary, type ListingRow } from './mappers';
import { call, ensure, requireUserId, toIso, unwrap, unwrapMaybe } from './shared';

type Row = {
  id: string;
  title: string;
  description: string | null;
  sector: string | null;
  published: boolean;
  updated_at: string;
  items: { sort_order: number; listing: ListingRow | null }[];
};

const COLUMNS = `id, title, description, sector, published, updated_at, items:vehicle_package_items(sort_order, listing:listings!vehicle_package_items_listing_id_fkey(${SUMMARY_COLUMNS}))`;

function toPackage(row: Row): VehiclePackage {
  const now = Date.now();
  const listings = [...row.items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((item) => (item.listing ? [toListingSummary(item.listing, now)] : []))
    .filter((l) => l.status !== 'withdrawn');
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sector: isSectorId(row.sector) ? row.sector : null,
    published: row.published,
    listings,
    totalPriceKurus: listings.reduce((sum, l) => sum + l.price.amountKurus, 0),
    updatedAt: toIso(row.updated_at),
  };
}

/** Araç paketleri: `vehicle_packages` + `vehicle_package_items` (ilanlar özet sütunlarıyla gömülü). */
export function createSupabasePackages(sb: Supabase): PackagesService {
  const fetchOne = async (id: string) => {
    const row = unwrapMaybe(await sb.from('vehicle_packages').select(COLUMNS).eq('id', id).maybeSingle()) as unknown as Row | null;
    if (!row) throw appError.notFound(`package ${id}`);
    return toPackage(row);
  };

  return {
    list: (input) =>
      call(async () => {
        let query = sb.from('vehicle_packages').select(COLUMNS);
        if (!input?.includeDrafts) query = query.eq('published', true);
        return (unwrap(await query.order('updated_at', { ascending: false })) as unknown as Row[]).map(toPackage);
      }),

    get: (id: string) => call(() => fetchOne(id)),

    save: (id: string | null, input: VehiclePackageInput) =>
      call(async () => {
        const title = input.title.trim();
        const listingIds = Array.from(new Set(input.listingIds)).slice(0, MAX_PACKAGE_LISTINGS);
        const errors: Record<string, string> = {};
        if (title.length < 3) errors.title = 'Paket adı en az 3 karakter olmalı.';
        if (listingIds.length === 0) errors.listings = 'Pakete en az bir ilan ekleyin.';
        if (Object.keys(errors).length) throw appError.validation(errors);
        const values = { title: title.slice(0, 100), description: input.description?.trim().slice(0, 1000) || null, sector: input.sector, published: input.published };
        const packageId = id
          ? (unwrap(await sb.from('vehicle_packages').update(values).eq('id', id).select('id').single()) as { id: string }).id
          : (unwrap(await sb.from('vehicle_packages').insert({ ...values, created_by: await requireUserId(sb) }).select('id').single()) as { id: string }).id;
        ensure(await sb.from('vehicle_package_items').delete().eq('package_id', packageId));
        ensure(await sb.from('vehicle_package_items').insert(listingIds.map((listing_id, i) => ({ package_id: packageId, listing_id, sort_order: i }))));
        return fetchOne(packageId);
      }),

    remove: (id: string) =>
      call(async () => {
        ensure(await sb.from('vehicle_packages').delete().eq('id', id));
      }),
  };
}
