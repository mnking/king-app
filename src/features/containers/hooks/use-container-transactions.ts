import { useQuery } from '@tanstack/react-query';
import {
  containerTransactionsApi,
  listContainerTransactions,
  listContainerTransactionsByContainer,
  type ContainerTransactionListParams,
  type ContainerTransactionsByContainerParams,
} from '@/services/apiContainerTransactions';
import { ContainerTransaction, ContainerTransactionCreateForm } from '../types';
import { createEntityHook } from '@/shared/hooks/useCrudOperations';

export const containerTransactionQueryKeys = {
  all: ['containerTransactions'] as const,
  list: (params: Record<string, unknown>) => [
    ...containerTransactionQueryKeys.all,
    'list',
    params,
  ] as const,
  byContainer: (containerNumber: string, params: Record<string, unknown>) => [
    ...containerTransactionQueryKeys.all,
    'container',
    containerNumber,
    params,
  ] as const,
  byCycle: (cycleId: string) => [
      ...containerTransactionQueryKeys.all,
      'cycle',
      cycleId
  ] as const,
};

export const useContainerTransactions = createEntityHook<
  ContainerTransaction,
  ContainerTransactionCreateForm,
  Partial<ContainerTransactionCreateForm>
>({
  queryKey: containerTransactionQueryKeys.all,
  api: {
    getAll: async () => {
      const response = await listContainerTransactions({ page: 1, itemsPerPage: 50 });
      return response.data?.results ?? [];
    },
    create: async (payload: ContainerTransactionCreateForm) => {
      const response = await containerTransactionsApi.create(payload);
      return response.data;
    },
    update: async () => {
      throw new Error('Update transaction is not supported');
    },
    delete: async (id: string) => {
      await containerTransactionsApi.delete(id);
      return { data: true, error: null };
    },
  },
  getId: (transaction) => transaction.id,
});

export const useContainerTransactionList = (params: ContainerTransactionListParams = {}) =>
  useQuery({
    queryKey: containerTransactionQueryKeys.list(params),
    queryFn: async () => {
      const response = await listContainerTransactions(params);
      return response.data;
    },
    keepPreviousData: true,
staleTime:0,
  });

export const useContainerTransactionsByContainer = (
  containerNumber: string,
  params: ContainerTransactionsByContainerParams = {},
) =>
  useQuery({
    queryKey: containerTransactionQueryKeys.byContainer(containerNumber, params),
    queryFn: async () => {
      const response = await listContainerTransactionsByContainer(containerNumber, params);
      return response.data;
    },
    enabled: Boolean(containerNumber),
    keepPreviousData: true,
staleTime:0,
  });

export const useCycleTransactions = (cycleId: string | null) =>
  useQuery({
    queryKey: cycleId ? containerTransactionQueryKeys.byCycle(cycleId) : ['containerTransactions', 'cycle', 'skipped'],
    queryFn: async () => {
      if (!cycleId) return [];
      const response = await listContainerTransactions({ cycleId, itemsPerPage: 100 });
      return response.data?.results ?? [];
    },
    enabled: Boolean(cycleId),
staleTime:0, // 5 minutes cache
  });
