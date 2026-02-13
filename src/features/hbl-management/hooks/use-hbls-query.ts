import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hblsApi } from '@/services/apiForwarder';
import type {
  HouseBill,
  HBLCreateForm,
  HBLUpdateForm,
  PaginatedResponse,
  HBLsQueryParams,
} from '../types';

type UseHBLsOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  cacheTime?: number;
  keepPreviousData?: boolean;
  refetchOnMount?: boolean | 'always';
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

// Query Keys
export const hblQueryKeys = {
  all: ['hbls'] as const,
  lists: () => [...hblQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...hblQueryKeys.lists(), filters] as const,
  details: () => [...hblQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...hblQueryKeys.details(), id] as const,
  byForwarder: (forwarderId: string) =>
    [...hblQueryKeys.all, 'forwarder', forwarderId] as const,
};

const shouldPromoteUpdatedHbl = (params?: Record<string, unknown>) => {
  if (!params) return true;
  const baseKeys = new Set(['page', 'itemsPerPage', 'hasPackingList']);
  return !Object.entries(params).some(([key, value]) => {
    if (value === undefined || value === null || value === '') return false;
    return !baseKeys.has(key);
  });
};

const updateHblResults = (
  results: HouseBill[],
  updated: HouseBill,
  promote: boolean,
) => {
  const index = results.findIndex((hbl) => hbl.id === updated.id);
  if (index === -1) {
    return results;
  }
  if (promote) {
    return [updated, ...results.filter((hbl) => hbl.id !== updated.id)];
  }
  const next = [...results];
  next[index] = updated;
  return next;
};

// Hooks
export function useHBLs(params: HBLsQueryParams = {}, options?: UseHBLsOptions) {
  return useQuery({
    queryKey: hblQueryKeys.list(params),
    queryFn: async () => {
      const response = await hblsApi.getAll(params);

      return response.data;
    },
    retry: 1,
    staleTime: options?.staleTime,
    gcTime: options?.gcTime ?? options?.cacheTime,
    keepPreviousData: options?.keepPreviousData,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
    enabled: options?.enabled ?? true,
  });
}

export function useAllHBLs(params: Omit<HBLsQueryParams, 'page' | 'itemsPerPage'> = {}) {
  return useQuery({
    queryKey: [...hblQueryKeys.all, 'all-pages', params],
    queryFn: async (): Promise<HouseBill[]> => {
      const pageSize = 50;
      let page = 1;
      let total = Number.MAX_SAFE_INTEGER;
      const results: HouseBill[] = [];

      while (results.length < total) {
        const response = await hblsApi.getAll({
          ...params,
          page,
          itemsPerPage: pageSize,
        });
        const data = response.data;
        const chunk = data.results ?? [];
        results.push(...chunk);
        total =
          typeof data.total === 'number' && data.total > 0
            ? data.total
            : results.length;

        if (chunk.length < pageSize || results.length >= total) {
          break;
        }

        page += 1;
      }

      return results;
    },
    gcTime: 0,
    retry: 1,
  });
}

export function useHBL(id: string) {
  return useQuery({
    queryKey: hblQueryKeys.detail(id),
    queryFn: async () => {
      const response = await hblsApi.getById(id);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: !!id,
  });
}

export function useCreateHBL() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: HBLCreateForm) => {
      const response = await hblsApi.create(data);
      return response.data;
    },
    onSuccess: (newHBL) => {
      // Invalidate and refetch HBLs lists
      queryClient.invalidateQueries({ queryKey: hblQueryKeys.lists() });

      // Optimistically add to cache for immediate UI update
      queryClient.setQueryData<PaginatedResponse<HouseBill>>(
        hblQueryKeys.list({}),
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: [newHBL, ...oldData.results],
              total: oldData.total + 1,
            };
          }
          return {
            results: [newHBL],
            total: 1,
            page: 1,
            itemsPerPage: 20,
          };
        },
      );

      // Set the detail query data for the new HBL
      queryClient.setQueryData(hblQueryKeys.detail(newHBL.id), newHBL);

      // Invalidate forwarder-specific queries
      if (newHBL.issuerId) {
        queryClient.invalidateQueries({
          queryKey: hblQueryKeys.byForwarder(newHBL.issuerId),
        });
      }
    },
  });
}

export function useUpdateHBL() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: HBLUpdateForm }) => {
      const response = await hblsApi.update(id, data);
      return response.data;
    },
    onSuccess: (updatedHBL) => {
      // Update specific HBL in cache
      queryClient.setQueryData(hblQueryKeys.detail(updatedHBL.id), updatedHBL);

      // Update HBLs lists
      const listQueries = queryClient.getQueriesData<PaginatedResponse<HouseBill>>({
        queryKey: hblQueryKeys.lists(),
      });
      listQueries.forEach(([queryKey, oldData]) => {
        if (!oldData) return;
        const params = queryKey[2] as Record<string, unknown> | undefined;
        const promote = shouldPromoteUpdatedHbl(params);
        const nextResults = updateHblResults(oldData.results, updatedHBL, promote);
        if (nextResults === oldData.results) return;
        queryClient.setQueryData<PaginatedResponse<HouseBill>>(queryKey, {
          ...oldData,
          results: nextResults,
        });
      });

      // Invalidate forwarder-specific queries
      if (updatedHBL.issuerId) {
        queryClient.invalidateQueries({
          queryKey: hblQueryKeys.byForwarder(updatedHBL.issuerId),
        });
      }
    },
  });
}

export function useApproveHBL() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await hblsApi.approve(id);
      return response.data;
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: hblQueryKeys.detail(id) });

      // Snapshot the previous value
      const previousHBL = queryClient.getQueryData<HouseBill>(
        hblQueryKeys.detail(id),
      );

      // Optimistically update to the new value
      if (previousHBL) {
        queryClient.setQueryData<HouseBill>(hblQueryKeys.detail(id), {
          ...previousHBL,
          status: 'approved',
        });
      }

      return { previousHBL };
    },
    onSuccess: (approvedHBL) => {
      // Update specific HBL in cache with actual server response
      queryClient.setQueryData(hblQueryKeys.detail(approvedHBL.id), approvedHBL);

      // Update HBLs lists
      const listQueries = queryClient.getQueriesData<PaginatedResponse<HouseBill>>({
        queryKey: hblQueryKeys.lists(),
      });
      listQueries.forEach(([queryKey, oldData]) => {
        if (!oldData) return;
        const params = queryKey[2] as Record<string, unknown> | undefined;
        const promote = shouldPromoteUpdatedHbl(params);
        const nextResults = updateHblResults(oldData.results, approvedHBL, promote);
        if (nextResults === oldData.results) return;
        queryClient.setQueryData<PaginatedResponse<HouseBill>>(queryKey, {
          ...oldData,
          results: nextResults,
        });
      });
    },
    onError: (_err, id, context) => {
      // Rollback on error
      if (context?.previousHBL) {
        queryClient.setQueryData(hblQueryKeys.detail(id), context.previousHBL);
      }
    },
  });
}

export function useMarkHBLDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, marked }: { id: string; marked: boolean }) => {
      const response = await hblsApi.markDone(id, marked);
      return response.data;
    },
    onMutate: async ({ id, marked }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: hblQueryKeys.detail(id) });

      // Snapshot the previous value
      const previousHBL = queryClient.getQueryData<HouseBill>(
        hblQueryKeys.detail(id),
      );

      // Optimistically update to the new value
      if (previousHBL) {
        queryClient.setQueryData<HouseBill>(hblQueryKeys.detail(id), {
          ...previousHBL,
          marked,
          status: marked ? 'done' : previousHBL.status,
        });
      }

      return { previousHBL };
    },
    onSuccess: (updatedHBL) => {
      // Update specific HBL in cache with actual server response
      queryClient.setQueryData(hblQueryKeys.detail(updatedHBL.id), updatedHBL);

      // Invalidate HBLs lists to refetch from backend
      // Backend filters out 'done' HBLs by default, so the marked HBL will be removed from the list
      queryClient.invalidateQueries({ queryKey: hblQueryKeys.lists() });
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousHBL) {
        queryClient.setQueryData(hblQueryKeys.detail(id), context.previousHBL);
      }
    },
  });
}

export function useDeleteHBL() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await hblsApi.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: hblQueryKeys.detail(deletedId) });

      // Update HBLs lists
      queryClient.setQueriesData<PaginatedResponse<HouseBill>>(
        { queryKey: hblQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.filter((hbl) => hbl.id !== deletedId),
              total: oldData.total - 1,
            };
          }
          return oldData;
        },
      );

      // Invalidate all queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: hblQueryKeys.all });
    },
  });
}

// Utility hook for HBL-related queries
export function useHBLQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateHBLs: () =>
      queryClient.invalidateQueries({ queryKey: hblQueryKeys.all }),
    invalidateHBLsList: () =>
      queryClient.invalidateQueries({ queryKey: hblQueryKeys.lists() }),
    invalidateHBL: (id: string) =>
      queryClient.invalidateQueries({ queryKey: hblQueryKeys.detail(id) }),
    invalidateForwarderHBLs: (forwarderId: string) =>
      queryClient.invalidateQueries({
        queryKey: hblQueryKeys.byForwarder(forwarderId),
      }),
    refetchHBLs: () => queryClient.refetchQueries({ queryKey: hblQueryKeys.all }),
  };
}
