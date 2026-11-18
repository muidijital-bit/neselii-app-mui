import { appError, asAdvisorId, type Advisor, type AdvisorId } from '@/domain';

import type { AdvisorsService, SaveAdvisorInput } from '../contracts';
import type { Supabase } from './client';
import type { Tables } from './database.types';
import { call, ensure, unwrap, unwrapMaybe } from './shared';

type Row = Pick<Tables<'advisors'>, 'id' | 'full_name' | 'phone' | 'active'>;
const COLUMNS = 'id, full_name, phone, active';

const toAdvisor = (row: Row): Advisor => ({ id: asAdvisorId(row.id), fullName: row.full_name, phone: row.phone, active: row.active });

function toRow(input: SaveAdvisorInput) {
  const fullName = input.fullName.trim().replace(/\s+/g, ' ');
  if (fullName.length < 2) throw appError.validation({ fullName: 'Danışmanın adını girin.' });
  const phone = input.phone?.trim() || null;
  return { full_name: fullName, phone, active: input.active };
}

/** Danışmanlar: `advisors` tablosu. RLS: okuma oturumlu herkese, yazma yöneticiye açık. */
export function createSupabaseAdvisors(sb: Supabase): AdvisorsService {
  return {
    list: (input) =>
      call(async () => {
        let query = sb.from('advisors').select(COLUMNS);
        if (!input?.includeInactive) query = query.eq('active', true);
        const rows = unwrap(await query.order('full_name'));
        return rows.map(toAdvisor);
      }),

    get: (id: AdvisorId) =>
      call(async () => {
        const row = unwrapMaybe(await sb.from('advisors').select(COLUMNS).eq('id', id).maybeSingle());
        if (!row) throw appError.notFound(`advisor ${id}`);
        return toAdvisor(row);
      }),

    create: (input: SaveAdvisorInput) =>
      call(async () => toAdvisor(unwrap(await sb.from('advisors').insert(toRow(input)).select(COLUMNS).single()))),

    update: (id: AdvisorId, input: SaveAdvisorInput) =>
      call(async () => {
        const row = unwrapMaybe(await sb.from('advisors').update(toRow(input)).eq('id', id).select(COLUMNS).maybeSingle());
        if (!row) throw appError.notFound(`advisor ${id}`);
        return toAdvisor(row);
      }),

    remove: (id: AdvisorId) =>
      call(async () => {
        ensure(await sb.from('advisors').delete().eq('id', id));
      }),
  };
}
