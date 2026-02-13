import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { shippingLinesApi } from '@/services/apiCarrier';
import type {
  PaginatedResponse,
  ShippingLine,
  ShippingLineCreateForm,
  ShippingLineStats,
  ShippingLineUpdateForm,
  ShippingLinesQueryParams,
} from '@/features/shipping-lines/types';

// Query Keys
export const shippingLineQueryKeys = {
  all: ['shippingLines'] as const,
  lists: () => [...shippingLineQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...shippingLineQueryKeys.lists(), filters] as const,
  details: () => [...shippingLineQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...shippingLineQueryKeys.details(), id] as const,
  stats: () => [...shippingLineQueryKeys.all, 'stats'] as const,
};

interface UseShippingLinesOptions {
  enabled?: boolean;
}

/**
 * Fetch shipping lines with pagination and filtering
 */
export function useShippingLines(
  params: ShippingLinesQueryParams = {},
  options?: UseShippingLinesOptions,
) {
  return useQuery({
    queryKey: shippingLineQueryKeys.list(params),
    queryFn: async () => {
      const response = await shippingLinesApi.getAll(params);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch single shipping line by ID
 */
export function useShippingLine(id: string) {
  return useQuery({
    queryKey: shippingLineQueryKeys.detail(id),
    queryFn: async () => {
      const response = await shippingLinesApi.getById(id);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: !!id,
  });
}

export function useShippingLineStats() {
  return useQuery({
    queryKey: shippingLineQueryKeys.stats(),
    queryFn: async () => {
      const response = await shippingLinesApi.getStats();
      return response.data as ShippingLineStats;
    },
    staleTime: 0,
    retry: 1,
  });
}

export function useCreateShippingLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ShippingLineCreateForm) => {
      const response = await shippingLinesApi.create(data);
      return response.data;
    },
    onSuccess: (newShippingLine) => {
      queryClient.invalidateQueries({ queryKey: shippingLineQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: shippingLineQueryKeys.stats() });

      queryClient.setQueryData<PaginatedResponse<ShippingLine>>(
        shippingLineQueryKeys.list({}),
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: [newShippingLine, ...oldData.results],
              total: oldData.total + 1,
            };
          }
          return {
            results: [newShippingLine],
            total: 1,
          };
        },
      );

      queryClient.setQueryData(
        shippingLineQueryKeys.detail(newShippingLine.id),
        newShippingLine,
      );
    },
  });
}

export function useUpdateShippingLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ShippingLineUpdateForm;
    }) => {
      const response = await shippingLinesApi.update(id, data);
      return response.data;
    },
    onSuccess: (updatedShippingLine) => {
      queryClient.setQueryData(
        shippingLineQueryKeys.detail(updatedShippingLine.id),
        updatedShippingLine,
      );

      queryClient.setQueriesData<PaginatedResponse<ShippingLine>>(
        { queryKey: shippingLineQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.map((shippingLine) =>
                shippingLine.id === updatedShippingLine.id
                  ? updatedShippingLine
                  : shippingLine,
              ),
            };
          }
          return oldData;
        },
      );

      queryClient.invalidateQueries({ queryKey: shippingLineQueryKeys.stats() });
    },
  });
}

export function useDeleteShippingLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await shippingLinesApi.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({
        queryKey: shippingLineQueryKeys.detail(deletedId),
      });

      queryClient.setQueriesData<PaginatedResponse<ShippingLine>>(
        { queryKey: shippingLineQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.filter(
                (shippingLine) => shippingLine.id !== deletedId,
              ),
              total: oldData.total - 1,
            };
          }
          return oldData;
        },
      );

      queryClient.invalidateQueries({ queryKey: shippingLineQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: shippingLineQueryKeys.stats() });
    },
  });
}

export function useShippingLineQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateShippingLines: () =>
      queryClient.invalidateQueries({ queryKey: shippingLineQueryKeys.all }),
    invalidateShippingLinesList: () =>
      queryClient.invalidateQueries({ queryKey: shippingLineQueryKeys.lists() }),
    invalidateShippingLine: (id: string) =>
      queryClient.invalidateQueries({ queryKey: shippingLineQueryKeys.detail(id) }),
    refetchShippingLines: () =>
      queryClient.refetchQueries({ queryKey: shippingLineQueryKeys.all }),
  };
}
