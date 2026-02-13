import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getPartialDestuffingContainers } from '@/services/apiCFSPlanning';
import { getHBLs } from '@/services/apiForwarder';
import type { PartialDestuffingContainer } from '../../types';

export const partialDestuffingContainersQueryKey = (forwarderId?: string | null) =>
  ['destuffing', 'partial-containers', forwarderId ?? null] as const;

export function usePartialDestuffingContainers(
  forwarderId?: string | null,
  options?: Partial<
    UseQueryOptions<
      PartialDestuffingContainer[],
      Error,
      PartialDestuffingContainer[],
      ReturnType<typeof partialDestuffingContainersQueryKey>
    >
  >,
) {
  return useQuery({
    queryKey: partialDestuffingContainersQueryKey(forwarderId ?? null),
    queryFn: async (): Promise<PartialDestuffingContainer[]> => {
      const response = await getPartialDestuffingContainers(forwarderId ?? undefined);
      const containers = response.data ?? [];
      const hblIds = Array.from(
        new Set(
          containers
            .flatMap((container) => container.orderContainer?.hbls ?? container.hbls ?? [])
            .map((hbl) => hbl?.hblId)
            .filter((hblId): hblId is string => Boolean(hblId)),
        ),
      );

      if (hblIds.length === 0) {
        return containers;
      }

      const hblResponse = await getHBLs({
        hblIds,
        itemsPerPage: Math.min(hblIds.length, 1000),
      });
      const waitingHblIds = new Set(
        (hblResponse.data?.results ?? [])
          .filter((hbl) => hbl?.destuffStatus?.toUpperCase() === 'WAITING')
          .map((hbl) => hbl.id),
      );
      const filterHbls = <T extends { hblId?: string | null }>(
        hbls?: T[] | null,
      ): T[] | null | undefined =>
        hbls?.filter((hbl) => hbl?.hblId && waitingHblIds.has(hbl.hblId)) ?? hbls;

      return containers.map((container) => ({
        ...container,
        orderContainer: container.orderContainer
          ? {
              ...container.orderContainer,
              hbls: filterHbls(container.orderContainer.hbls),
            }
          : container.orderContainer,
        hbls: filterHbls(container.hbls),
      }));
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
    ...options,
  });
}
