import { AVAILABLE_TERMS, DEFAULT_COST_SETTINGS, DEFAULT_FINANCE_SETTINGS, appError, type BankRate, type CostSettings, type FinanceSettings } from '@/domain';

import type { FinanceService } from '../contracts';
import type { Supabase } from './client';
import type { Json, Tables } from './database.types';
import { call, ensure, unwrap, unwrapMaybe } from './shared';

type Row = Omit<Tables<'finance_settings'>, 'id' | 'updated_at'>;
type BankRow = Pick<Tables<'bank_rates'>, 'id' | 'name' | 'monthly_rate_percent' | 'active'>;
const toBank = (row: BankRow): BankRate => ({ id: row.id, name: row.name, monthlyRatePercent: Number(row.monthly_rate_percent), active: row.active });
const COLUMNS =
  'monthly_rate_percent, min_down_payment_percent, terms, fuel_price_tl, fuel_consumption, maintenance_tl_per_km, tire_tl_per_km, insurance_tl_per_year, tax_tl_per_year';

function toConsumption(value: Json): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_COST_SETTINGS.fuelConsumption };
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const num = Number(raw);
    if (Number.isFinite(num) && num >= 0) result[key] = num;
  }
  return result;
}

const toSettings = (row: Row): FinanceSettings => ({
  monthlyRatePercent: Number(row.monthly_rate_percent),
  minDownPaymentPercent: row.min_down_payment_percent,
  terms: [...row.terms].sort((a, b) => a - b),
  costs: {
    fuelPriceTl: Number(row.fuel_price_tl),
    fuelConsumption: toConsumption(row.fuel_consumption),
    maintenanceTlPerKm: Number(row.maintenance_tl_per_km),
    tireTlPerKm: Number(row.tire_tl_per_km),
    insuranceTlPerYear: Number(row.insurance_tl_per_year),
    taxTlPerYear: Number(row.tax_tl_per_year),
  },
});

const nonNegative = (value: number, max: number) => Number.isFinite(value) && value >= 0 && value <= max;

function validateCosts(costs: CostSettings, errors: Record<string, string>): Omit<Row, 'monthly_rate_percent' | 'min_down_payment_percent' | 'terms'> {
  if (!nonNegative(costs.fuelPriceTl, 1000)) errors.fuelPriceTl = 'Geçerli bir yakıt fiyatı girin.';
  if (!nonNegative(costs.maintenanceTlPerKm, 1000)) errors.maintenanceTlPerKm = 'Geçerli bir değer girin.';
  if (!nonNegative(costs.tireTlPerKm, 1000)) errors.tireTlPerKm = 'Geçerli bir değer girin.';
  if (!nonNegative(costs.insuranceTlPerYear, 100_000_000)) errors.insuranceTlPerYear = 'Geçerli bir değer girin.';
  if (!nonNegative(costs.taxTlPerYear, 100_000_000)) errors.taxTlPerYear = 'Geçerli bir değer girin.';
  const consumption: Record<string, number> = {};
  for (const [key, value] of Object.entries(costs.fuelConsumption)) {
    if (!nonNegative(value, 200)) errors.fuelConsumption = 'Tüketim 0–200 L/100 km arasında olmalı.';
    else consumption[key] = Math.round(value * 10) / 10;
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    fuel_price_tl: round2(costs.fuelPriceTl),
    fuel_consumption: consumption,
    maintenance_tl_per_km: round2(costs.maintenanceTlPerKm),
    tire_tl_per_km: round2(costs.tireTlPerKm),
    insurance_tl_per_year: Math.round(costs.insuranceTlPerYear),
    tax_tl_per_year: Math.round(costs.taxTlPerYear),
  };
}

function validate(settings: FinanceSettings): Row {
  const errors: Record<string, string> = {};
  const rate = Math.round(settings.monthlyRatePercent * 100) / 100;
  if (!Number.isFinite(rate) || rate < 0 || rate > 20) errors.monthlyRatePercent = 'Aylık faiz %0 ile %20 arasında olmalı.';
  const down = Math.round(settings.minDownPaymentPercent);
  if (!Number.isFinite(down) || down < 0 || down > 90) errors.minDownPaymentPercent = 'Peşinat oranı %0 ile %90 arasında olmalı.';
  const terms = Array.from(new Set(settings.terms)).filter((term) => AVAILABLE_TERMS.includes(term)).sort((a, b) => a - b);
  if (terms.length === 0) errors.terms = 'En az bir vade seçin.';
  const costs = validateCosts(settings.costs, errors);
  if (Object.keys(errors).length > 0) throw appError.validation(errors);
  return { monthly_rate_percent: rate, min_down_payment_percent: down, terms, ...costs };
}

/** Finansman ayarları: `finance_settings` tek satır tablosu. */
export function createSupabaseFinance(sb: Supabase): FinanceService {
  return {
    getSettings: () =>
      call(async () => {
        const row = unwrapMaybe(await sb.from('finance_settings').select(COLUMNS).eq('id', true).maybeSingle());
        return row ? toSettings(row) : DEFAULT_FINANCE_SETTINGS;
      }),

    updateSettings: (settings: FinanceSettings) =>
      call(async () => {
        const row = unwrapMaybe(await sb.from('finance_settings').update(validate(settings)).eq('id', true).select(COLUMNS).maybeSingle());
        if (!row) throw appError.notFound('finance_settings');
        return toSettings(row);
      }),

    listBanks: (input) =>
      call(async () => {
        let query = sb.from('bank_rates').select('id, name, monthly_rate_percent, active');
        if (!input?.includeInactive) query = query.eq('active', true);
        return unwrap(await query.order('sort_order').order('name')).map(toBank);
      }),

    saveBank: (id, input) =>
      call(async () => {
        const name = input.name.trim().slice(0, 60);
        const rate = Math.round(input.monthlyRatePercent * 100) / 100;
        const errors: Record<string, string> = {};
        if (!name) errors.name = 'Banka adını girin.';
        if (!Number.isFinite(rate) || rate < 0 || rate > 20) errors.rate = 'Oran %0 ile %20 arasında olmalı.';
        if (Object.keys(errors).length) throw appError.validation(errors);
        const values = { name, monthly_rate_percent: rate, active: input.active };
        const row = id
          ? unwrapMaybe(await sb.from('bank_rates').update(values).eq('id', id).select('id, name, monthly_rate_percent, active').maybeSingle())
          : unwrap(await sb.from('bank_rates').insert(values).select('id, name, monthly_rate_percent, active').single());
        if (!row) throw appError.notFound(`bank ${id}`);
        return toBank(row);
      }),

    removeBank: (id) =>
      call(async () => {
        ensure(await sb.from('bank_rates').delete().eq('id', id));
      }),
  };
}
