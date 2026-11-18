import { appError, isSectorId, type Guide, type GuideInput, type SectorId } from '@/domain';

import type { GuidesService } from '../contracts';
import type { Supabase } from './client';
import type { Tables } from './database.types';
import { call, ensure, requireUserId, toIso, unwrap, unwrapMaybe } from './shared';

type Row = Pick<Tables<'guides'>, 'id' | 'title' | 'body' | 'sector' | 'published' | 'updated_at'>;
const COLUMNS = 'id, title, body, sector, published, updated_at';

const toGuide = (row: Row): Guide => ({
  id: row.id,
  title: row.title,
  body: row.body,
  sector: isSectorId(row.sector) ? row.sector : null,
  published: row.published,
  updatedAt: toIso(row.updated_at),
});

/** Sektör rehberi: `guides` tablosu (yayımlananlar herkese açık, yönetici yönetir). */
export function createSupabaseGuides(sb: Supabase): GuidesService {
  return {
    list: (input) =>
      call(async () => {
        let query = sb.from('guides').select(COLUMNS);
        if (!input?.includeDrafts) query = query.eq('published', true);
        const sector: SectorId | null | undefined = input?.sector;
        if (sector) query = query.or(`sector.is.null,sector.eq.${sector}`);
        return unwrap(await query.order('updated_at', { ascending: false }).limit(100)).map(toGuide);
      }),

    get: (id: string) =>
      call(async () => {
        const row = unwrapMaybe(await sb.from('guides').select(COLUMNS).eq('id', id).maybeSingle());
        if (!row) throw appError.notFound(`guide ${id}`);
        return toGuide(row);
      }),

    save: (id: string | null, input: GuideInput) =>
      call(async () => {
        const title = input.title.trim();
        const body = input.body.trim();
        const errors: Record<string, string> = {};
        if (title.length < 3) errors.title = 'Başlık en az 3 karakter olmalı.';
        if (!body) errors.body = 'Yazı metnini girin.';
        if (Object.keys(errors).length) throw appError.validation(errors);
        const values = { title: title.slice(0, 140), body: body.slice(0, 20000), sector: input.sector, published: input.published };
        const row = id
          ? unwrapMaybe(await sb.from('guides').update(values).eq('id', id).select(COLUMNS).maybeSingle())
          : unwrap(await sb.from('guides').insert({ ...values, created_by: await requireUserId(sb) }).select(COLUMNS).single());
        if (!row) throw appError.notFound(`guide ${id}`);
        return toGuide(row);
      }),

    remove: (id: string) =>
      call(async () => {
        ensure(await sb.from('guides').delete().eq('id', id));
      }),
  };
}
