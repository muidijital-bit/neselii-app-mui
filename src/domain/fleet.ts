import type { IsoDateTime } from './common';
import type { TradeInCategory } from './tradeIns';

/**
 * Filo yönetimi (Adım 11): müşterinin mevcut araçları (madde 48), yenileme eşikleri (madde 49) ve muayene / sigorta / bakım tarihleri (madde 50).
 * Hatırlatmaları sunucu her sabah gönderir (14 gün kala ve günü gelince; yenileme eşiği aşılınca bir kez).
 */
export type FleetVehicle = {
  readonly id: string;
  readonly plate: string;
  readonly category: TradeInCategory | null;
  readonly brand: string | null;
  readonly model: string | null;
  readonly year: number | null;
  readonly km: number | null;
  /** `YYYY-MM-DD`. */
  readonly inspectionDue: string | null;
  readonly insuranceDue: string | null;
  readonly serviceDue: string | null;
  readonly renewalAgeYears: number;
  readonly renewalKm: number;
  readonly note: string | null;
  readonly updatedAt: IsoDateTime;
};

export type FleetVehicleInput = Omit<FleetVehicle, 'id' | 'updatedAt'>;

export const DEFAULT_RENEWAL_AGE_YEARS = 10;
export const DEFAULT_RENEWAL_KM = 1_000_000;

export type FleetDateKind = 'inspection' | 'insurance' | 'service';

export const FLEET_DATE_LABELS: Record<FleetDateKind, string> = { inspection: 'Muayene', insurance: 'Sigorta', service: 'Bakım' };

/** `YYYY-MM-DD` tarihine kalan gün (cihazın yerel günüyle; geçmişse negatif). */
export function daysUntil(dateKey: string, now: Date = new Date()): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

/** Araç yenileme eşiğini aştı mı (madde 49). */
export function renewalDue(v: Pick<FleetVehicle, 'year' | 'km' | 'renewalAgeYears' | 'renewalKm'>, now: Date = new Date()): boolean {
  return (v.year !== null && now.getFullYear() - v.year >= v.renewalAgeYears) || (v.km !== null && v.km >= v.renewalKm);
}

/** Aracın en yakın tarihli hatırlatması (liste rozeti için); tarih yoksa `null`. */
export function nextDue(v: FleetVehicle, now: Date = new Date()): { kind: FleetDateKind; days: number } | null {
  const items = (
    [
      ['inspection', v.inspectionDue],
      ['insurance', v.insuranceDue],
      ['service', v.serviceDue],
    ] as const
  ).flatMap(([kind, date]) => (date ? [{ kind, days: daysUntil(date, now) }] : []));
  return items.sort((a, b) => a.days - b.days)[0] ?? null;
}
