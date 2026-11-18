import { asAdvisorId, type ListingInsights, type ListingInsightsInput } from '@/domain';

import type { Tables, TablesInsert } from './database.types';
import { toIso } from './shared';

/** İlan detayı sorgusuna eklenen gömülü seçim (madde 11–13). */
export const INSIGHTS_COLUMNS =
  'usage_type, owner_count, last_service_date, last_service_km, history_note, check_expertise, check_maintenance, check_no_heavy_damage, ' +
  'check_inspection, check_documents, check_service_records, strengths, cautions, updated_at, expert:advisors!listing_insights_expert_advisor_id_fkey(id, full_name)';

export type InsightsRow = Omit<Tables<'listing_insights'>, 'listing_id' | 'expert_advisor_id'> & {
  expert: { id: string; full_name: string } | null;
};

export function toInsights(row: InsightsRow): ListingInsights {
  return {
    usageType: row.usage_type,
    ownerCount: row.owner_count,
    lastServiceDate: row.last_service_date,
    lastServiceKm: row.last_service_km,
    historyNote: row.history_note,
    checks: {
      expertise: row.check_expertise,
      maintenance: row.check_maintenance,
      noHeavyDamage: row.check_no_heavy_damage,
      inspection: row.check_inspection,
      documents: row.check_documents,
      serviceRecords: row.check_service_records,
    },
    expert: row.expert ? { id: asAdvisorId(row.expert.id), fullName: row.expert.full_name } : null,
    strengths: row.strengths ?? [],
    cautions: row.cautions ?? [],
    updatedAt: toIso(row.updated_at),
  };
}

const text = (value: string | null, max: number) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};
const items = (values: readonly string[]) => values.map((v) => v.trim().slice(0, 160)).filter(Boolean).slice(0, 10);
const nonNegativeInt = (value: number | null, max: number) =>
  value === null || !Number.isFinite(value) ? null : Math.min(max, Math.max(0, Math.round(value)));

export function toInsightsRow(listingId: string, input: ListingInsightsInput): TablesInsert<'listing_insights'> {
  return {
    listing_id: listingId,
    usage_type: text(input.usageType, 60),
    owner_count: nonNegativeInt(input.ownerCount, 50),
    last_service_date: input.lastServiceDate,
    last_service_km: nonNegativeInt(input.lastServiceKm, 10_000_000),
    history_note: text(input.historyNote, 1000),
    check_expertise: input.checks.expertise,
    check_maintenance: input.checks.maintenance,
    check_no_heavy_damage: input.checks.noHeavyDamage,
    check_inspection: input.checks.inspection,
    check_documents: input.checks.documents,
    check_service_records: input.checks.serviceRecords,
    expert_advisor_id: input.expertId,
    strengths: items(input.strengths),
    cautions: items(input.cautions),
  };
}
