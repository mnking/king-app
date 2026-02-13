import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  containerCyclesApi,
  listContainerCycles,
  type ContainerCycleListParams,
} from '@/services/apiContainerCycles';
import { ContainerCycle, ContainerCycleCreateForm, ContainerCycleEndForm } from '../types';
import { createEntityHook } from '@/shared/hooks/useCrudOperations';

export const containerCycleQueryKeys = {
  all: ['containerCycles'] as const,
  list: (params: Record<string, unknown>) => [
    ...containerCycleQueryKeys.all,
    'list',
    params,
  ] as const,
  detail: (id: string) => [...containerCycleQueryKeys.all, 'detail', id] as const,
};

export const useContainerCycles = createEntityHook<
  ContainerCycle,
  ContainerCycleCreateForm,
  ContainerCycleEndForm
>({
  queryKey: containerCycleQueryKeys.all as unknown as string[],
  api: {
    getAll: async () => {
      const response = await listContainerCycles({ page: 1, itemsPerPage: 50 });
      return response.data?.results ?? [];
    },
    create: async (payload: ContainerCycleCreateForm) => {
      const response = await containerCyclesApi.create(payload);
      return response.data;
    },
    update: async (id: string, payload: ContainerCycleEndForm) => {
      const response = await containerCyclesApi.end(id, payload);
      return response.data;
    },
    delete: async (id: string) => {
      await containerCyclesApi.delete(id);
      return { data: true, error: null };
    },
  },
  getId: (cycle) => cycle.id,
});

export const useContainerCycleList = (
  params: ContainerCycleListParams = {},
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: containerCycleQueryKeys.list(params as Record<string, unknown>),
    queryFn: async () => {
      const response = await listContainerCycles(params);
      return response.data;
    },
    placeholderData: keepPreviousData,
staleTime:0,
    enabled: options?.enabled,
  });

export const useContainerCycle = (id: string) =>
  useQuery({
    queryKey: containerCycleQueryKeys.detail(id),
    queryFn: async () => {
      const response = await containerCyclesApi.getById(id);
      return response.data;
    },
    enabled: Boolean(id),
staleTime:0,
  });
