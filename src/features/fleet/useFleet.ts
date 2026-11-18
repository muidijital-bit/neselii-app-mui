import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { FleetVehicle, FleetVehicleInput } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

function useScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true, userId: session?.user.id ?? null };
}

export const fleetKeys = {
  all: (userId: string | null) => ['fleet', userId] as const,
  list: (userId: string | null) => ['fleet', userId, 'list'] as const,
  detail: (userId: string | null, id: string) => ['fleet', userId, 'detail', id] as const,
};

export function useFleetQuery() {
  const { fleet } = useServices();
  const { enabled, userId } = useScope();
  return useQuery({ queryKey: fleetKeys.list(userId), queryFn: () => fleet.list(), enabled });
}

export function useFleetVehicleQuery(id: string) {
  const { fleet } = useServices();
  const { enabled, userId } = useScope();
  return useQuery({ queryKey: fleetKeys.detail(userId, id), queryFn: () => fleet.get(id), enabled: enabled && id !== '', gcTime: 0 });
}

export function useFleetMutations() {
  const { fleet } = useServices();
  const { userId } = useScope();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: fleetKeys.all(userId) });
  const save = useMutation<FleetVehicle, unknown, { id: string | null; input: FleetVehicleInput }>({ mutationFn: ({ id, input }) => fleet.save(id, input), onSuccess: refresh });
  const remove = useMutation<void, unknown, string>({ mutationFn: (id) => fleet.remove(id), onSuccess: refresh });
  return { save, remove };
}
