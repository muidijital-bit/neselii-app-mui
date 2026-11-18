/**
 * Talep süreç adımları (Adım 12):
 *  - Madde 22: finansman başvuru takibi — müşteri görür, adım değişince bildirim alır.
 *  - Madde 34: satış süreci takibi — firma içi (yalnız yönetici ekranlarında).
 */
export type FinanceStage = 'received' | 'documents' | 'bank' | 'approved' | 'completed' | 'declined';
export type SalesStage = 'meeting' | 'quote' | 'financing' | 'notary' | 'delivery' | 'won' | 'lost';

export const FINANCE_STAGES: readonly { readonly id: FinanceStage; readonly label: string }[] = [
  { id: 'received', label: 'Başvuru alındı' },
  { id: 'documents', label: 'Belgeler bekleniyor' },
  { id: 'bank', label: 'Bankada' },
  { id: 'approved', label: 'Onaylandı' },
  { id: 'completed', label: 'Sonuçlandı' },
];

/** Olumsuz sonuç (adım çizgisinin dışında). */
export const FINANCE_DECLINED = { id: 'declined' as const, label: 'Olumsuz sonuçlandı' };

export const SALES_STAGES: readonly { readonly id: SalesStage; readonly label: string }[] = [
  { id: 'meeting', label: 'Görüşme' },
  { id: 'quote', label: 'Teklif' },
  { id: 'financing', label: 'Finansman' },
  { id: 'notary', label: 'Noter' },
  { id: 'delivery', label: 'Teslimat' },
  { id: 'won', label: 'Satış tamamlandı' },
  { id: 'lost', label: 'Kaybedildi' },
];

export const isFinanceStage = (v: unknown): v is FinanceStage => v === FINANCE_DECLINED.id || FINANCE_STAGES.some((s) => s.id === v);
export const isSalesStage = (v: unknown): v is SalesStage => SALES_STAGES.some((s) => s.id === v);

export const financeStageLabel = (stage: FinanceStage) => (stage === 'declined' ? FINANCE_DECLINED.label : (FINANCE_STAGES.find((s) => s.id === stage)?.label ?? stage));
export const salesStageLabel = (stage: SalesStage) => SALES_STAGES.find((s) => s.id === stage)?.label ?? stage;
