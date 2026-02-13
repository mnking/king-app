import { useQuery } from '@tanstack/react-query';
import { cargoPackageHandoverApi } from '@/services/apiCargoPackageHandover';
import type { CargoPackageRecord } from '../types';

export function useHandoverCargoPackages(packingListId: string | null) {
  return useQuery<CargoPackageRecord[], Error>({
    queryKey: ['cargo-packages-for-handover', packingListId],
    enabled: Boolean(packingListId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<CargoPackageRecord[]> => {
      if (!packingListId) return [];
      const packages = await cargoPackageHandoverApi.getAll(packingListId);
      return packages;
    },
  });
}
