import { appError, type FleetVehicle, type FleetVehicleInput, type TradeInCategory } from '@/domain';

import type { FleetService } from '../contracts';
import type { Supabase } from './client';
import type { Tables } from './database.types';
import { call, ensure, requireUserId, toIso, unwrap, unwrapMaybe } from './shared';

type Row = Tables<'fleet_vehicles'>;
const CATEGORIES: readonly TradeInCategory[] = ['kamyon', 'cekici', 'dorse', 'ticari-arac'];

const toVehicle = (row: Row): FleetVehicle => ({
  id: row.id,
  plate: row.plate,
  category: (CATEGORIES as readonly (string | null)[]).includes(row.category_slug) ? (row.category_slug as TradeInCategory) : null,
  brand: row.brand,
  model: row.model,
  year: row.year,
  km: row.km,
  inspectionDue: row.inspection_due,
  insuranceDue: row.insurance_due,
  serviceDue: row.service_due,
  renewalAgeYears: row.renewal_age_years,
  renewalKm: row.renewal_km,
  note: row.note,
  updatedAt: toIso(row.updated_at),
});

const clean = (value: string | null, max: number) => value?.trim().slice(0, max) || null;

/** Filo envanteri: `fleet_vehicles` (RLS: yalnız sahibi). */
export function createSupabaseFleet(sb: Supabase): FleetService {
  return {
    list: () =>
      call(async () => {
        const userId = await requireUserId(sb);
        return unwrap(await sb.from('fleet_vehicles').select('*').eq('user_id', userId).order('created_at', { ascending: false })).map(toVehicle);
      }),

    get: (id: string) =>
      call(async () => {
        const row = unwrapMaybe(await sb.from('fleet_vehicles').select('*').eq('id', id).maybeSingle());
        if (!row) throw appError.notFound(`vehicle ${id}`);
        return toVehicle(row);
      }),

    save: (id: string | null, input: FleetVehicleInput) =>
      call(async () => {
        const plate = input.plate.trim().toUpperCase().replace(/\s+/g, ' ');
        if (plate.length < 2) throw appError.validation({ plate: 'Plakayı girin.' });
        const values = {
          plate: plate.slice(0, 15),
          category_slug: input.category,
          brand: clean(input.brand, 60),
          model: clean(input.model, 80),
          year: input.year,
          km: input.km,
          inspection_due: input.inspectionDue,
          insurance_due: input.insuranceDue,
          service_due: input.serviceDue,
          renewal_age_years: Math.min(50, Math.max(1, Math.round(input.renewalAgeYears))),
          renewal_km: Math.min(10_000_000, Math.max(10_000, Math.round(input.renewalKm))),
          note: clean(input.note, 500),
        };
        const row = id
          ? unwrapMaybe(await sb.from('fleet_vehicles').update(values).eq('id', id).select('*').maybeSingle())
          : unwrap(await sb.from('fleet_vehicles').insert({ ...values, user_id: await requireUserId(sb) }).select('*').single());
        if (!row) throw appError.notFound(`vehicle ${id}`);
        return toVehicle(row);
      }),

    remove: (id: string) =>
      call(async () => {
        ensure(await sb.from('fleet_vehicles').delete().eq('id', id));
      }),
  };
}
