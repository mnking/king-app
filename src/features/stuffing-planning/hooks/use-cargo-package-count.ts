import { useQuery } from '@tanstack/react-query';
import { cargoPackagesApi } from '@/services/apiCargoPackages';

export const cargoPackageCountQueryKey = (packingListId?: string | null) =>
  ['cargo-package-count', packingListId] as const;

export const useCargoPackageCount = (packingListId?: string | null) =>
  useQuery({
    queryKey: cargoPackageCountQueryKey(packingListId),
    queryFn: async () => {
      if (!packingListId) return 0;
      return cargoPackagesApi.getCountByPackingList(packingListId);
    },
    enabled: Boolean(packingListId),
    staleTime: 60_000,
    retry: 1,
  });
