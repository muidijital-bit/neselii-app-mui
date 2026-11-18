import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { asListingId } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

function useAdminScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true && session.user.role === 'admin', userId: session?.user.id ?? null };
}

export const callLogsKeys = {
  all: ['call-logs'] as const,
  list: (userId: string | null) => ['call-logs', userId, 'list'] as const,
  summary: (userId: string | null) => ['call-logs', userId, 'summary'] as const,
  listing: (userId: string | null, listingId: string) => ['call-logs', userId, 'listing', listingId] as const,
};

/** Yönetici: son aramalar (sayfalı). */
export function useCallLogsQuery() {
  const { callLogs } = useServices();
  const { enabled, userId } = useAdminScope();
  return useInfiniteQuery({
    queryKey: callLogsKeys.list(userId),
    queryFn: ({ pageParam }) => callLogs.list({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

export function useCallSummaryQuery() {
  const { callLogs } = useServices();
  const { enabled, userId } = useAdminScope();
  return useQuery({ queryKey: callLogsKeys.summary(userId), queryFn: () => callLogs.summary(), enabled });
}

/** Yönetici: ilanın arama sayıları (ilan detayındaki yönetici bölümü). */
export function useListingCallStats(listingId: string) {
  const { callLogs } = useServices();
  const { enabled, userId } = useAdminScope();
  return useQuery({ queryKey: callLogsKeys.listing(userId, listingId), queryFn: () => callLogs.statsForListing(asListingId(listingId)), enabled });
}
