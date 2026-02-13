import { useQuery } from '@tanstack/react-query';

import { cargoPackagesApi } from '@/services/apiCargoPackages';
import type { PositionStatus } from '../types';

const queryKeys = {
  available: (packingListId: string, status: string) => [
    'cargo-package-select',
    packingListId,
    'available',
    status,
  ],
};

export const useCargoPackageSelectData = (
  packingListId: string | undefined,
  availablePackagesStatus: PositionStatus = 'STORED',
) => {
  const availableQuery = useQuery({
    queryKey: packingListId
      ? queryKeys.available(packingListId, availablePackagesStatus)
      : ['cargo-package-select', '_', 'available', availablePackagesStatus],
    queryFn: () =>
      cargoPackagesApi.fetchByStatus({
        packingListId: packingListId ?? '',
        status: availablePackagesStatus,
      }),
    enabled: Boolean(packingListId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  return {
    availableQuery,
  };
};

export const cargoPackageSelectQueryKeys = queryKeys;
