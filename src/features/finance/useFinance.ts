import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BankRate, FinanceSettings } from '@/domain';
import { useServices } from '@/services';

export const financeKeys = { settings: ['finance-settings'] as const, banks: (all: boolean) => ['bank-rates', all] as const };

/** Finansman ayarları (herkes okur). Firma oranı nadiren değişir; 5 dk taze sayılır. */
export function useFinanceSettings() {
  const { finance } = useServices();
  return useQuery({ queryKey: financeKeys.settings, queryFn: () => finance.getSettings(), staleTime: 5 * 60_000 });
}

/** Yönetici: ayarları kaydet; başarıda önbellek güncellenir (hesaplayıcılar yeni oranla hesaplar). */
export function useUpdateFinanceSettings() {
  const { finance } = useServices();
  const queryClient = useQueryClient();
  return useMutation<FinanceSettings, unknown, FinanceSettings>({
    mutationFn: (settings) => finance.updateSettings(settings),
    onSuccess: (settings) => queryClient.setQueryData(financeKeys.settings, settings),
  });
}

/** Madde 20: anlaşmalı bankalar. `includeInactive` yönetici ekranı içindir. */
export function useBanks(includeInactive = false) {
  const { finance } = useServices();
  return useQuery({ queryKey: financeKeys.banks(includeInactive), queryFn: () => finance.listBanks({ includeInactive }), staleTime: 5 * 60_000 });
}

export function useBankMutations() {
  const { finance } = useServices();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['bank-rates'] });
  const save = useMutation<BankRate, unknown, { id: string | null; name: string; monthlyRatePercent: number; active: boolean }>({
    mutationFn: ({ id, ...input }) => finance.saveBank(id, input),
    onSuccess: refresh,
  });
  const remove = useMutation<void, unknown, string>({ mutationFn: (id) => finance.removeBank(id), onSuccess: refresh });
  return { save, remove };
}
