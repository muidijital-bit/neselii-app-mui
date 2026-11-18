import { appError, type DamageStatus, type KurusRange, type LeadId, type TradeInCategory, type TradeInDetail, type TradeInMedia, type TradeInSection, type TradeInUpload, type TradeInVehicleInput } from '@/domain';

import type { TradeInsService } from '../contracts';
import type { Supabase } from './client';
import { call, ensure, kurusToTl, requireUserId, tlToKurus, unwrap, unwrapMaybe } from './shared';

const BUCKET = 'trade-in';
/** İmzalı adres süresi (saniye). */
const SIGNED_URL_TTL = 60 * 60;

const CATEGORIES: readonly TradeInCategory[] = ['kamyon', 'cekici', 'dorse', 'ticari-arac'];
const DAMAGES: readonly DamageStatus[] = ['none', 'repaired', 'damaged'];
const SECTIONS: readonly TradeInSection[] = ['exterior', 'interior', 'engine', 'body'];

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

function contentTypeOf(file: TradeInUpload): string {
  if (file.mimeType && EXTENSIONS[file.mimeType]) return file.mimeType;
  const ext = file.uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'png') return 'image/png';
  if (ext === 'heic') return 'image/heic';
  return file.kind === 'video' ? 'video/mp4' : 'image/jpeg';
}

/** Takas / satış talebinin aracı ve medyası: `trade_ins`, `trade_in_media`, özel `trade-in` depolama alanı. */
export function createSupabaseTradeIns(sb: Supabase): TradeInsService {
  return {
    saveVehicle: (leadId: LeadId, vehicle: TradeInVehicleInput) =>
      call(async () => {
        const brand = vehicle.brand.trim();
        if (!brand) throw appError.validation({ brand: 'Aracın markasını girin.' });
        ensure(
          await sb.from('trade_ins').insert({
            lead_id: leadId,
            category_slug: vehicle.category,
            brand: brand.slice(0, 60),
            model: vehicle.model?.trim().slice(0, 80) || null,
            year: vehicle.year,
            km: vehicle.km,
            damage_status: vehicle.damageStatus,
            expected_price: vehicle.expectedPriceKurus === null ? null : kurusToTl(vehicle.expectedPriceKurus),
          }),
        );
      }),

    uploadMedia: (leadId: LeadId, file: TradeInUpload) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const contentType = contentTypeOf(file);
        const path = `${userId}/${leadId}/${file.section}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXTENSIONS[contentType] ?? 'bin'}`;
        const body = await (await fetch(file.uri)).arrayBuffer();
        const { error } = await sb.storage.from(BUCKET).upload(path, body, { contentType, upsert: false });
        if (error) throw error;
        ensure(await sb.from('trade_in_media').insert({ lead_id: leadId, section: file.section, kind: file.kind, storage_path: path }));
      }),

    get: (leadId: LeadId) =>
      call(async (): Promise<TradeInDetail | null> => {
        const row = unwrapMaybe(
          await sb
            .from('trade_ins')
            .select('category_slug, brand, model, year, km, damage_status, expected_price, valuation_min, valuation_max, valuated_at')
            .eq('lead_id', leadId)
            .maybeSingle(),
        );
        if (!row) return null;
        const mediaRows = unwrap(await sb.from('trade_in_media').select('id, section, kind, storage_path').eq('lead_id', leadId).order('created_at'));
        const signed = mediaRows.length
          ? ((await sb.storage.from(BUCKET).createSignedUrls(mediaRows.map((m) => m.storage_path), SIGNED_URL_TTL)).data ?? [])
          : [];
        const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
        const media: TradeInMedia[] = mediaRows.map((m) => ({
          id: m.id,
          section: (SECTIONS as readonly string[]).includes(m.section) ? (m.section as TradeInSection) : 'exterior',
          kind: m.kind === 'video' ? 'video' : 'photo',
          uri: urlByPath.get(m.storage_path) ?? null,
        }));
        const hasValuation = row.valuation_min !== null || row.valuation_max !== null;
        return {
          vehicle: {
            category: (CATEGORIES as readonly string[]).includes(row.category_slug) ? (row.category_slug as TradeInCategory) : 'kamyon',
            brand: row.brand,
            model: row.model,
            year: row.year,
            km: row.km,
            damageStatus: (DAMAGES as readonly string[]).includes(row.damage_status ?? '') ? (row.damage_status as DamageStatus) : null,
            expectedPriceKurus: row.expected_price === null ? null : tlToKurus(row.expected_price),
            valuation: hasValuation
              ? { minKurus: tlToKurus(row.valuation_min ?? row.valuation_max), maxKurus: tlToKurus(row.valuation_max ?? row.valuation_min) }
              : null,
            valuatedAt: row.valuated_at,
          },
          media,
        };
      }),

    setValuation: (leadId: LeadId, valuation: KurusRange | null) =>
      call(async () => {
        if (valuation && (valuation.minKurus <= 0 || valuation.maxKurus < valuation.minKurus)) {
          throw appError.validation({ valuation: 'En az değer sıfırdan büyük ve en çok değerden küçük olmalı.' });
        }
        const row = unwrapMaybe(
          await sb
            .from('trade_ins')
            .update({ valuation_min: valuation ? kurusToTl(valuation.minKurus) : null, valuation_max: valuation ? kurusToTl(valuation.maxKurus) : null })
            .eq('lead_id', leadId)
            .select('lead_id')
            .maybeSingle(),
        );
        if (!row) throw appError.notFound(`trade-in ${leadId}`);
      }),
  };
}
