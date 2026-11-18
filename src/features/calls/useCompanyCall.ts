import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { asListingId } from '@/domain';
import { callCompany } from '@/features/listings/companyPhone';
import { useServices } from '@/services';

/**
 * "Hemen Ara" (madde 27): firmayı arar ve dokunuşu ilan bazında kaydeder. Kayıt arka planda yazılır; başarısız olsa da arama engellenmez.
 * `listingId` null ise genel arama (ana sayfa) olarak kaydedilir.
 */
export function useCompanyCall() {
  const { callLogs } = useServices();
  const queryClient = useQueryClient();
  return useCallback(
    (listingId: string | null, onUnavailable: (message: string) => void) => {
      void callLogs
        .log(listingId ? asListingId(listingId) : null)
        .then(() => queryClient.invalidateQueries({ queryKey: ['call-logs'] }))
        .catch(() => undefined);
      callCompany(onUnavailable);
    },
    [callLogs, queryClient],
  );
}
