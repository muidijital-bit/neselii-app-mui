import { AVAILABLE_TERMS, DEFAULT_FINANCE_SETTINGS, appError, type FinanceSettings } from '@/domain';

import type { FinanceService } from '../contracts';
import type { Supabase } from './client';
import type { Tables } from './database.types';
import { call, unwrapMaybe } from './shared';

type Row = Pick<Tables<'finance_settings'>, 'monthly_rate_percent' | 'min_down_payment_percent' | 'terms'>;
const COLUMNS = 'monthly_rate_percent, min_down_payment_percent, terms';

const toSettings = (row: Row): FinanceSettings => ({
  monthlyRatePercent: Number(row.monthly_rate_percent),
  minDownPaymentPercent: row.min_down_payment_percent,
  terms: [...row.terms].sort((a, b) => a - b),
});

function validate(settings: FinanceSettings): Row {
  const errors: Record<string, string> = {};
  const rate = Math.round(settings.monthlyRatePercent * 100) / 100;
  if (!Number.isFinite(rate) || rate < 0 || rate > 20) errors.monthlyRatePercent = 'Aylık faiz %0 ile %20 arasında olmalı.';
  const down = Math.round(settings.minDownPaymentPercent);
  if (!Number.isFinite(down) || down < 0 || down > 90) errors.minDownPaymentPercent = 'Peşinat oranı %0 ile %90 arasında olmalı.';
  const terms = Array.from(new Set(settings.terms)).filter((term) => AVAILABLE_TERMS.includes(term)).sort((a, b) => a - b);
  if (terms.length === 0) errors.terms = 'En az bir vade seçin.';
  if (Object.keys(errors).length > 0) throw appError.validation(errors);
  return { monthly_rate_percent: rate, min_down_payment_percent: down, terms };
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
  };
}
