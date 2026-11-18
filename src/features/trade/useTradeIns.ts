import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { asLeadId, type KurusRange, type Lead, type LeadTimeSlot, type ListingId, type TradeInKind, type TradeInUpload, type TradeInVehicleInput } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

export const tradeInKeys = { detail: (userId: string | null, leadId: string) => ['trade-ins', userId, leadId] as const };

export function useTradeInQuery(leadId: string, enabled: boolean) {
  const { tradeIns } = useServices();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({ queryKey: tradeInKeys.detail(userId, leadId), queryFn: () => tradeIns.get(asLeadId(leadId)), enabled: enabled && leadId !== '' });
}

export type SubmitTradeInInput = {
  readonly kind: TradeInKind;
  readonly listingId: ListingId | null;
  readonly vehicle: TradeInVehicleInput;
  readonly files: readonly TradeInUpload[];
  readonly contactPhone: string;
  readonly preferredSlot: LeadTimeSlot;
  readonly note: string;
};

/**
 * Takas / satış başvurusu: 1) talep (danışman ataması ve yönetici bildirimi sunucuda), 2) araç bilgisi, 3) dosyalar tek tek yüklenir (`progress`).
 * Bir dosya yüklenemezse başvuru yine kaydedilmiş olur; `failedUploads` sayısı gösterilir.
 */
export function useSubmitTradeIn() {
  const { leads, tradeIns } = useServices();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const mutation = useMutation<{ lead: Lead; failedUploads: number }, unknown, SubmitTradeInInput>({
    mutationFn: async (input) => {
      const lead = await leads.create({
        listingId: input.kind === 'trade_in' ? input.listingId : null,
        topic: input.kind,
        preferredDate: null,
        preferredSlot: input.preferredSlot,
        contactPhone: input.contactPhone,
        note: input.note,
      });
      await tradeIns.saveVehicle(lead.id, input.vehicle);
      let failedUploads = 0;
      setProgress({ done: 0, total: input.files.length });
      for (const [i, file] of input.files.entries()) {
        try {
          await tradeIns.uploadMedia(lead.id, file);
        } catch {
          failedUploads += 1;
        }
        setProgress({ done: i + 1, total: input.files.length });
      }
      return { lead, failedUploads };
    },
    onSettled: () => {
      setProgress(null);
      void queryClient.invalidateQueries({ queryKey: ['leads', userId] });
    },
  });
  return { ...mutation, progress };
}

/** Madde 37 (yönetici): ön değerlendirme aralığı. */
export function useSetValuation(leadId: string) {
  const { tradeIns } = useServices();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  return useMutation<void, unknown, KurusRange | null>({
    mutationFn: (valuation) => tradeIns.setValuation(asLeadId(leadId), valuation),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: tradeInKeys.detail(userId, leadId) }),
  });
}
