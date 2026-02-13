import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import type { PaginatedResponse } from '@/features/zones-locations/types';
import type {
  CreatePackageTransactionPayload,
  PackageTransaction,
  PackageTransactionQueryParams,
} from '@/features/cfs-cargo-package-delivery/types/package-transaction-types';

export const packageTransactionQueryKeys = {
  all: ['package-transactions'] as const,
  lists: () => [...packageTransactionQueryKeys.all, 'list'] as const,
  list: (params: PackageTransactionQueryParams) =>
    [...packageTransactionQueryKeys.lists(), params] as const,
  details: () => [...packageTransactionQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...packageTransactionQueryKeys.details(), id] as const,
};

export function usePackageTransactions(params: PackageTransactionQueryParams) {
  return useQuery({
    queryKey: packageTransactionQueryKeys.list(params),
    queryFn: async (): Promise<PaginatedResponse<PackageTransaction>> => {
      const response = await packageTransactionsApi.getAll(params);
      return response.data;
    },
    enabled: Boolean(params.packingListId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
}

export function usePackageTransaction(
  id: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: packageTransactionQueryKeys.detail(id),
    queryFn: async (): Promise<PackageTransaction> => {
      const response = await packageTransactionsApi.getById(id);
      return response.data;
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
}

export function useCreatePackageTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: CreatePackageTransactionPayload,
    ): Promise<PackageTransaction> => {
      const response = await packageTransactionsApi.create(payload);
      return response.data;
    },
    onSuccess: (created: PackageTransaction) => {
      queryClient.setQueryData(packageTransactionQueryKeys.detail(created.id), created);
      queryClient.invalidateQueries({ queryKey: packageTransactionQueryKeys.lists() });
      toast.success('Transaction created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create transaction');
    },
  });
}

