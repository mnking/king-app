import { useQuery } from '@tanstack/react-query';
import { cargoPackagesApi } from '@/services/apiCargoPackages';
import type { CargoPackageRecord } from '../types';

export function useStorageCargoPackages(packingListId: string | null) {
  return useQuery<CargoPackageRecord[], Error>({
    queryKey: ['cargo-packages-for-storage', packingListId],
    enabled: Boolean(packingListId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<CargoPackageRecord[]> => {
      if (!packingListId) return [];
      const { results } = await cargoPackagesApi.fetchByPackingList({
        packingListId,
        itemsPerPage: 1000,
      });
      return results;
    },
  });
}
