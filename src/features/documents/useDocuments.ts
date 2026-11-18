import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { asLeadId, type CustomerDocument, type DocumentKind, type LocalFile, type UserId } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

function useScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true, userId: session?.user.id ?? null };
}

export const documentKeys = {
  all: (userId: string | null) => ['documents', userId] as const,
  mine: (userId: string | null) => ['documents', userId, 'mine'] as const,
  lead: (userId: string | null, leadId: string) => ['documents', userId, 'lead', leadId] as const,
};

/** Müşteri: Belgelerim (madde 52). */
export function useMyDocuments() {
  const { documents } = useServices();
  const { enabled, userId } = useScope();
  return useQuery({ queryKey: documentKeys.mine(userId), queryFn: () => documents.listMine(), enabled });
}

export function useLeadDocuments(leadId: string) {
  const { documents } = useServices();
  const { enabled, userId } = useScope();
  return useQuery({ queryKey: documentKeys.lead(userId, leadId), queryFn: () => documents.listForLead(asLeadId(leadId)), enabled: enabled && leadId !== '' });
}

export type UploadDocumentInput = { readonly customerId: UserId; readonly leadId: string | null; readonly kind: DocumentKind; readonly title: string; readonly file: LocalFile };

/** Yönetici: belge yükle / sil. Başarıda belge listeleri yenilenir. */
export function useDocumentMutations() {
  const { documents } = useServices();
  const { userId } = useScope();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: documentKeys.all(userId) });
  const upload = useMutation<CustomerDocument, unknown, UploadDocumentInput>({
    mutationFn: (input) => documents.upload({ ...input, leadId: input.leadId ? asLeadId(input.leadId) : null }),
    onSuccess: refresh,
  });
  const remove = useMutation<void, unknown, string>({ mutationFn: (id) => documents.remove(id), onSuccess: refresh });
  return { upload, remove };
}
