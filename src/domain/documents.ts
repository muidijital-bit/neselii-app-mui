import type { IsoDateTime } from './common';
import type { LeadId } from './ids';

/** Madde 52: müşterinin belge arşivi (Belgelerim). Madde 32: teklifler de buraya `quote` olarak düşer. */
export type DocumentKind = 'quote' | 'expertise' | 'delivery' | 'contract' | 'other';

export const DOCUMENT_KINDS: readonly DocumentKind[] = ['quote', 'expertise', 'delivery', 'contract', 'other'];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  quote: 'Teklif',
  expertise: 'Ekspertiz',
  delivery: 'Teslimat',
  contract: 'Sözleşme',
  other: 'Diğer',
};

export type CustomerDocument = {
  readonly id: string;
  readonly kind: DocumentKind;
  readonly title: string;
  readonly leadId: LeadId | null;
  readonly createdAt: IsoDateTime;
  /** Süreli imzalı adres; alınamazsa `null`. */
  readonly uri: string | null;
};

/** Yüklenecek yerel dosya (belge seçiciden ya da PDF üreticiden). */
export type LocalFile = { readonly uri: string; readonly name: string; readonly mimeType: string | null };
