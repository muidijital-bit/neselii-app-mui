import { appError, asLeadId, type CustomerDocument, type DocumentKind, type LeadId, type LocalFile, type UserId } from '@/domain';

import type { DocumentsService } from '../contracts';
import type { Supabase } from './client';
import { call, ensure, requireUserId, toIso, unwrap } from './shared';

const BUCKET = 'customer-documents';
const SIGNED_URL_TTL = 60 * 60;
const KINDS: readonly DocumentKind[] = ['quote', 'expertise', 'delivery', 'contract', 'other'];
const COLUMNS = 'id, kind, title, lead_id, storage_path, created_at';

type Row = { id: string; kind: string; title: string; lead_id: string | null; storage_path: string; created_at: string };

/** Müşteri belge arşivi: `customer_documents` + özel `customer-documents` alanı (<müşteri kimliği>/<dosya>). */
export function createSupabaseDocuments(sb: Supabase): DocumentsService {
  const withUrls = async (rows: readonly Row[]): Promise<CustomerDocument[]> => {
    const signed = rows.length ? ((await sb.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_TTL)).data ?? []) : [];
    const byPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
    return rows.map((r) => ({
      id: r.id,
      kind: (KINDS as readonly string[]).includes(r.kind) ? (r.kind as DocumentKind) : 'other',
      title: r.title,
      leadId: r.lead_id ? asLeadId(r.lead_id) : null,
      createdAt: toIso(r.created_at),
      uri: byPath.get(r.storage_path) ?? null,
    }));
  };

  return {
    listMine: () =>
      call(async () => {
        const userId = await requireUserId(sb);
        return withUrls(unwrap(await sb.from('customer_documents').select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: false })));
      }),

    listForLead: (leadId: LeadId) =>
      call(async () => withUrls(unwrap(await sb.from('customer_documents').select(COLUMNS).eq('lead_id', leadId).order('created_at', { ascending: false })))),

    upload: ({ customerId, leadId, kind, title, file }: { customerId: UserId; leadId: LeadId | null; kind: DocumentKind; title: string; file: LocalFile }) =>
      call(async () => {
        const adminId = await requireUserId(sb);
        const cleanTitle = title.trim().slice(0, 120);
        if (!cleanTitle) throw appError.validation({ title: 'Belge adını girin.' });
        const contentType = file.mimeType ?? 'application/pdf';
        const ext = contentType === 'application/pdf' ? 'pdf' : contentType === 'image/png' ? 'png' : 'jpg';
        const path = `${customerId}/${kind}-${Date.now()}.${ext}`;
        const body = await (await fetch(file.uri)).arrayBuffer();
        const { error } = await sb.storage.from(BUCKET).upload(path, body, { contentType, upsert: false });
        if (error) throw error;
        const row = unwrap(
          await sb
            .from('customer_documents')
            .insert({ user_id: customerId, lead_id: leadId, kind, title: cleanTitle, storage_path: path, created_by: adminId })
            .select(COLUMNS)
            .single(),
        );
        return (await withUrls([row]))[0];
      }),

    remove: (id: string) =>
      call(async () => {
        const rows = unwrap(await sb.from('customer_documents').select('storage_path').eq('id', id));
        ensure(await sb.from('customer_documents').delete().eq('id', id));
        if (rows[0]) await sb.storage.from(BUCKET).remove([rows[0].storage_path]);
      }),
  };
}
