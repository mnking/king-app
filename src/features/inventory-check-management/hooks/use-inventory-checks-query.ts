import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InventoryPlanFormData } from '../schemas';
import type { InventoryPlanCheckQueryParams } from '../types';
import {
  createInventoryPlanCheck,
  deleteInventoryPlanCheck,
  fetchInventoryPlanChecks,
  startInventoryPlanCheck,
  updateInventoryPlanCheck,
} from '@/services/apiInventoryCheck';

export const inventoryPlanCheckQueryKeys = {
  all: ['inventory-plan-checks'] as const,
  lists: () => [...inventoryPlanCheckQueryKeys.all, 'list'] as const,
  list: (filters: InventoryPlanCheckQueryParams) =>
    [...inventoryPlanCheckQueryKeys.lists(), filters] as const,
};

interface UseInventoryPlanChecksOptions {
  enabled?: boolean;
}

export const useInventoryPlanChecks = (
  params: InventoryPlanCheckQueryParams = {},
  options?: UseInventoryPlanChecksOptions,
) =>
  useQuery({
    queryKey: inventoryPlanCheckQueryKeys.list(params),
    queryFn: () => fetchInventoryPlanChecks(params),
    staleTime: 0,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });

export const useCreateInventoryPlanCheck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InventoryPlanFormData) =>
      createInventoryPlanCheck(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: inventoryPlanCheckQueryKeys.lists(),
      });
    },
  });
};

export const useUpdateInventoryPlanCheck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InventoryPlanFormData }) =>
      updateInventoryPlanCheck(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: inventoryPlanCheckQueryKeys.lists(),
      });
    },
  });
};

export const useDeleteInventoryPlanCheck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInventoryPlanCheck(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: inventoryPlanCheckQueryKeys.lists(),
      });
    },
  });
};

export const useStartInventoryPlanCheck = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startInventoryPlanCheck(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: inventoryPlanCheckQueryKeys.lists(),
      });
    },
  });
};
