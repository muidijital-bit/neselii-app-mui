import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { VehiclePackage, VehiclePackageInput } from '@/domain';
import { useIsAdmin } from '@/features/session/useIsAdmin';
import { useServices } from '@/services';

export const packageKeys = { all: ['packages'] as const, list: (drafts: boolean) => ['packages', 'list', drafts] as const, detail: (id: string) => ['packages', 'detail', id] as const };

export function usePackagesQuery() {
  const { packages } = useServices();
  const isAdmin = useIsAdmin();
  return useQuery({ queryKey: packageKeys.list(isAdmin), queryFn: () => packages.list({ includeDrafts: isAdmin }) });
}

export function usePackageQuery(id: string) {
  const { packages } = useServices();
  return useQuery({ queryKey: packageKeys.detail(id), queryFn: () => packages.get(id), enabled: id !== '' });
}

export function usePackageMutations() {
  const { packages } = useServices();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: packageKeys.all });
  const save = useMutation<VehiclePackage, unknown, { id: string | null; input: VehiclePackageInput }>({ mutationFn: ({ id, input }) => packages.save(id, input), onSuccess: refresh });
  const remove = useMutation<void, unknown, string>({ mutationFn: (id) => packages.remove(id), onSuccess: refresh });
  return { save, remove };
}
