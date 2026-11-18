import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { FinanceSettings } from '@/domain';
import { useServices } from '@/services';

export const financeKeys = { settings: ['finance-settings'] as const };

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
