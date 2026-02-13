import { useQuery } from '@tanstack/react-query';
import { hblsApi } from '@/services/apiForwarder';
import type { HBLsQueryParams } from '@/features/hbl-management/types';

// Query key factory base key (use [...approvedHBLsQueryKey, params])
export const approvedHBLsQueryKey = ['approved-hbls'] as const;

const DEFAULT_STATUS = 'Approved';
const DEFAULT_APPROVED_ITEMS_PER_PAGE = 1000;
const DEFAULT_CONTAINER_ITEMS_PER_PAGE = 1000;

type QueryFilterKeys = Pick<
  HBLsQueryParams,
  | 'issuerId'
  | 'keywords'
  | 'containerNumber'
  | 'sealNumber'
  | 'directionFlow'
  | 'sortField'
  | 'sortOrder'
  | 'page'
  | 'itemsPerPage'
>;

export type UseApprovedHBLFilters = QueryFilterKeys;
export type UseContainerHBLFilters = Pick<
  QueryFilterKeys,
  'issuerId' | 'keywords' | 'sortField' | 'sortOrder' | 'itemsPerPage'
>;

/**
 * Hook to fetch and cache all approved HBLs in the system
 * Uses TanStack Query for intelligent caching with 1-minute stale time
 * Now uses backend filtering for approved status
 */
export function useApprovedHBLs(filters: UseApprovedHBLFilters = {}) {
  const queryParams: HBLsQueryParams = {
    ...filters,
    status: DEFAULT_STATUS,
    itemsPerPage: filters.itemsPerPage ?? DEFAULT_APPROVED_ITEMS_PER_PAGE,
  };

  return useQuery({
    queryKey: [...approvedHBLsQueryKey, queryParams] as const,
    queryFn: async () => {
      const response = await hblsApi.getAll(queryParams);
      return response.data.results;
    },

    // Smart cache configuration
    staleTime: 0,
    gcTime: 5 * 60 * 1000,           // Keep in cache for 5 minutes (renamed from cacheTime in v5)
    refetchOnMount: 'always',        // Always check for updates when component mounts
    refetchOnWindowFocus: true,      // Refetch when user returns to tab
    refetchInterval: false,           // Don't poll automatically

    // Network optimization
    placeholderData: (previousData) => previousData, // Show old data while fetching new (renamed from keepPreviousData in v5)
    retry: 1,                        // Retry once on failure
  });
}

/**
 * Hook to fetch all HBLs by container number + seal number.
 * Booking order flow validates approval status in UI to enforce full-container approval.
 */
export function useContainerHBLs(
  containerNumber: string | undefined,
  sealNumber: string | undefined,
  filters: UseContainerHBLFilters = {},
) {
  const enabled = !!containerNumber && !!sealNumber;

  const query = useQuery({
    queryKey: ['container-hbls', containerNumber ?? null, sealNumber ?? null, filters] as const,
    queryFn: async () => {
      if (!containerNumber || !sealNumber) {
        return [];
      }

      const response = await hblsApi.getAll({
        containerNumber,
        sealNumber,
        issuerId: filters.issuerId,
        keywords: filters.keywords,
        sortField: filters.sortField,
        sortOrder: filters.sortOrder,
        directionFlow: filters.directionFlow ?? 'IMPORT',
        itemsPerPage: filters.itemsPerPage ?? DEFAULT_CONTAINER_ITEMS_PER_PAGE,
      });

      return response.data.results;
    },
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: 1,
  });

  return {
    matchingHBLs: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

/**
 * Utility to check if an HBL is already used in any container
 * within the current booking order form
 */
export function checkDuplicateHBL(
  hblId: string,
  allContainers: Array<{ hbls?: Array<{ hblId: string }> }>,
  currentContainerIndex: number,
  currentHBLIndex: number
): { isDuplicate: boolean; containerIndex?: number } {
  for (let containerIdx = 0; containerIdx < allContainers.length; containerIdx++) {
    const container = allContainers[containerIdx];
    const hbls = container.hbls || [];

    for (let hblIdx = 0; hblIdx < hbls.length; hblIdx++) {
      // Skip the current HBL being checked
      if (containerIdx === currentContainerIndex && hblIdx === currentHBLIndex) {
        continue;
      }

      // Check if HBL ID matches
      if (hbls[hblIdx].hblId === hblId) {
        return {
          isDuplicate: true,
          containerIndex: containerIdx + 1, // Human-readable index (1-based)
        };
      }
    }
  }

  return { isDuplicate: false };
}
