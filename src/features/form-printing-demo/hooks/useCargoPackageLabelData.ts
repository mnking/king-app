import { useQuery } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { cargoPackagesApi } from '@/services/apiCargoPackages';
import { usePackingList } from '@/features/packing-list/hooks';
import type { PaginatedCargoPackages } from '@/services/apiCargoPackages';

export const useCargoPackageLabelData = (
  packingListId: string | null,
  pagination: PaginationState,
) => {
  const packingListQuery = usePackingList(packingListId ?? '', {
    enabled: Boolean(packingListId),
  });

  const packagesQuery = useQuery<PaginatedCargoPackages, Error>({
    queryKey: [
      'cargo-packages-for-label',
      packingListId,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    enabled: Boolean(packingListId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!packingListId) return { results: [], total: 0 };
      const page = pagination.pageIndex + 1;
      const itemsPerPage = pagination.pageSize;
      return cargoPackagesApi.getPage(packingListId, page, itemsPerPage);
    },
  });

  return {
    packingList: packingListQuery.data ?? null,
    packages: packagesQuery.data?.results ?? [],
    totalCount: packagesQuery.data?.total ?? 0,
    isLoading: packingListQuery.isLoading || packagesQuery.isLoading,
    isFetching: packingListQuery.isFetching || packagesQuery.isFetching,
    error: packingListQuery.error || packagesQuery.error,
    refetch: () => {
      void packingListQuery.refetch();
      void packagesQuery.refetch();
    },
  };
};
