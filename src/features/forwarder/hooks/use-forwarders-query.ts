import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { forwardersApi } from '@/services/apiForwarder';
import type {
  Forwarder,
  ForwarderCreateForm,
  ForwarderUpdateForm,
  PaginatedResponse,
  ForwardersQueryParams,
  ForwarderStats,
} from '../types';

// Query Keys
export const forwarderQueryKeys = {
  all: ['forwarders'] as const,
  lists: () => [...forwarderQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...forwarderQueryKeys.lists(), filters] as const,
  details: () => [...forwarderQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...forwarderQueryKeys.details(), id] as const,
  byCode: (code: string) => [...forwarderQueryKeys.all, 'code', code] as const,
  stats: () => [...forwarderQueryKeys.all, 'stats'] as const,
};

// Hooks
interface UseForwardersOptions {
  enabled?: boolean;
}

export function useForwarders(
  params: ForwardersQueryParams = {},
  options?: UseForwardersOptions,
) {
  return useQuery({
    queryKey: forwarderQueryKeys.list(params),
    queryFn: async () => {
      const response = await forwardersApi.getAll(params);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useForwarder(id: string) {
  return useQuery({
    queryKey: forwarderQueryKeys.detail(id),
    queryFn: async () => {
      const response = await forwardersApi.getById(id);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: !!id,
  });
}

export function useForwarderStats() {
  return useQuery({
    queryKey: forwarderQueryKeys.stats(),
    queryFn: async () => {
      const response = await forwardersApi.getStats();
      return response.data as ForwarderStats;
    },
    staleTime: 0,
    retry: 1,
  });
}

export function useForwarderByCode(code: string) {
  return useQuery({
    queryKey: forwarderQueryKeys.byCode(code),
    queryFn: async () => {
      const response = await forwardersApi.getByCode(code);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: !!code,
  });
}

export function useCreateForwarder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ForwarderCreateForm) => {
      const response = await forwardersApi.create(data);
      return response.data;
    },
    onSuccess: (newForwarder) => {
      // Invalidate and refetch forwarders lists
      queryClient.invalidateQueries({ queryKey: forwarderQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: forwarderQueryKeys.stats() });

      // Optimistically add to cache for immediate UI update
      queryClient.setQueryData<PaginatedResponse<Forwarder>>(
        forwarderQueryKeys.list({}),
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: [newForwarder, ...oldData.results],
              total: oldData.total + 1,
            };
          }
          return {
            results: [newForwarder],
            total: 1,
            page: 1,
            itemsPerPage: 20,
          };
        },
      );

      // Set the detail query data for the new forwarder
      queryClient.setQueryData(
        forwarderQueryKeys.detail(newForwarder.id),
        newForwarder,
      );
    },
  });
}

export function useUpdateForwarder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ForwarderUpdateForm;
    }) => {
      const response = await forwardersApi.update(id, data);
      return response.data;
    },
    onSuccess: (updatedForwarder) => {
      // Update specific forwarder in cache
      queryClient.setQueryData(
        forwarderQueryKeys.detail(updatedForwarder.id),
        updatedForwarder,
      );

      // Update forwarders lists
      queryClient.setQueriesData<PaginatedResponse<Forwarder>>(
        { queryKey: forwarderQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.map((forwarder) =>
                forwarder.id === updatedForwarder.id ? updatedForwarder : forwarder,
              ),
            };
          }
          return oldData;
        },
      );

      // Invalidate by-code query if code exists
      if (updatedForwarder.code) {
        queryClient.invalidateQueries({
          queryKey: forwarderQueryKeys.byCode(updatedForwarder.code),
        });
      }

      queryClient.invalidateQueries({ queryKey: forwarderQueryKeys.stats() });
    },
  });
}

export function useDeleteForwarder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await forwardersApi.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: forwarderQueryKeys.detail(deletedId),
      });

      // Update forwarders lists
      queryClient.setQueriesData<PaginatedResponse<Forwarder>>(
        { queryKey: forwarderQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.filter(
                (forwarder) => forwarder.id !== deletedId,
              ),
              total: oldData.total - 1,
            };
          }
          return oldData;
        },
      );

      // Invalidate all queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: forwarderQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: forwarderQueryKeys.stats() });
    },
  });
}

// Utility hook for forwarder-related queries
export function useForwarderQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateForwarders: () =>
      queryClient.invalidateQueries({ queryKey: forwarderQueryKeys.all }),
    invalidateForwardersList: () =>
      queryClient.invalidateQueries({ queryKey: forwarderQueryKeys.lists() }),
    invalidateForwarder: (id: string) =>
      queryClient.invalidateQueries({ queryKey: forwarderQueryKeys.detail(id) }),
    invalidateForwarderByCode: (code: string) =>
      queryClient.invalidateQueries({ queryKey: forwarderQueryKeys.byCode(code) }),
    refetchForwarders: () =>
      queryClient.refetchQueries({ queryKey: forwarderQueryKeys.all }),
  };
}
