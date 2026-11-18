import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Guide, GuideInput, SectorId } from '@/domain';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { useServices } from '@/services';

export const guideKeys = {
  all: ['guides'] as const,
  list: (sector: SectorId | null, drafts: boolean) => ['guides', 'list', sector ?? 'all', drafts] as const,
  detail: (id: string) => ['guides', 'detail', id] as const,
};

/** Rehber yazıları; yönetici taslakları da görür. */
export function useGuidesQuery(sector: SectorId | null) {
  const { guides } = useServices();
  const isAdmin = useIsAdmin();
  return useQuery({ queryKey: guideKeys.list(sector, isAdmin), queryFn: () => guides.list({ sector, includeDrafts: isAdmin }) });
}

export function useGuideQuery(id: string) {
  const { guides } = useServices();
  return useQuery({ queryKey: guideKeys.detail(id), queryFn: () => guides.get(id), enabled: id !== '' });
}

export function useGuideMutations() {
  const { guides } = useServices();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: guideKeys.all });
  const save = useMutation<Guide, unknown, { id: string | null; input: GuideInput }>({ mutationFn: ({ id, input }) => guides.save(id, input), onSuccess: refresh });
  const remove = useMutation<void, unknown, string>({ mutationFn: (id) => guides.remove(id), onSuccess: refresh });
  return { save, remove };
}
