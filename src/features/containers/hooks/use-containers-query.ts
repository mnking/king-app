import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  containersApi,
  getContainer,
  getContainerByNumber,
  listContainers,
  type ContainerDetailParams,
  type ContainerListParams,
} from '@/services/apiContainers';
import { Container, ContainerCreateForm, ContainerDetail, ContainerUpdateForm } from '../types';
import { createEntityHook } from '@/shared/hooks/useCrudOperations';

export const containerQueryKeys = {
  all: ['containers'] as const,
  crud: () => [...containerQueryKeys.all, 'crud'] as const,
  list: (params: Record<string, unknown>) => [...containerQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...containerQueryKeys.all, 'detail', id] as const,
  byNumber: (number: string) => [...containerQueryKeys.all, 'by-number', number] as const,
  lastTransaction: (id: string) => [...containerQueryKeys.all, 'last-transaction', id] as const,
};

export const useContainers = createEntityHook<Container, ContainerCreateForm, ContainerUpdateForm>({
  queryKey: containerQueryKeys.crud(),
  api: {
    getAll: async () => {
      const response = await listContainers({ page: 1, itemsPerPage: 50 });
      return response.data?.results ?? [];
    },
    create: async (payload: ContainerCreateForm) => {
      const response = await containersApi.create(payload);
      return response.data;
    },
    update: async (id: string, updates: ContainerUpdateForm) => {
      const response = await containersApi.update(id, updates);
      return response.data;
    },
    delete: async (id: string) => {
      await containersApi.delete(id);
      return { data: true, error: null };
    },
  },
  getId: (container) => container.id,
});

export const useContainerList = (params: ContainerListParams = {}) =>
  useQuery({
    queryKey: containerQueryKeys.list(params),
    queryFn: async () => {
      const response = await listContainers(params);
      return response.data;
    },
    keepPreviousData: true,
  });

export function useAllContainers(params: Omit<ContainerListParams, 'page' | 'itemsPerPage'> = {}) {
  return useQuery({
    queryKey: [...containerQueryKeys.all, 'all-pages', params],
    queryFn: async (): Promise<Container[]> => {
      const pageSize = 10;
      let page = 1;
      let total = Number.MAX_SAFE_INTEGER;
      const results: Container[] = [];

      while (results.length < total) {
        const response = await listContainers({
          ...params,
          page,
          itemsPerPage: pageSize,
        });
        const data = response.data;
        const chunk = data.results ?? [];
        results.push(...chunk);
        total = typeof data.total === 'number' && data.total > 0 ? data.total : results.length;

        if (chunk.length < pageSize || results.length >= total) {
          break;
        }

        page += 1;
      }

      return results;
    },
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export const useContainer = (id: string, params: ContainerDetailParams = {}) =>
  useQuery({
    queryKey: containerQueryKeys.detail(id),
    queryFn: async () => {
      const response = await getContainer(id, params);
      return response.data;
    },
    enabled: Boolean(id),
  });

export const useContainerByNumber = (
  number: string,
  options?: { enabled?: boolean } & ContainerDetailParams,
) =>
  useQuery({
    queryKey: containerQueryKeys.byNumber(number),
    queryFn: async () => {
      const response = await getContainerByNumber(number, options);
      return response.data;
    },
    enabled: options?.enabled ?? Boolean(number),
    retry: false,
  });

export const useCreateContainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ContainerCreateForm) => {
      const response = await containersApi.create(payload);
      return response.data;
    },
    onSuccess: (container) => {
      queryClient.invalidateQueries({ queryKey: containerQueryKeys.list({}) });
      queryClient.setQueryData(containerQueryKeys.detail(container.id), container);
    },
  });
};

export const useUpdateContainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContainerUpdateForm }) => {
      const response = await containersApi.update(id, data);
      return response.data;
    },
    onSuccess: (container) => {
      queryClient.setQueryData(containerQueryKeys.detail(container.id), container);
      queryClient.invalidateQueries({ queryKey: containerQueryKeys.list({}) });
    },
  });
};

export const useDeleteContainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await containersApi.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: containerQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: containerQueryKeys.list({}) });
    },
  });
};

export const useContainerQueries = () => {
  const queryClient = useQueryClient();
  return {
    invalidateContainers: () => queryClient.invalidateQueries({ queryKey: containerQueryKeys.all }),
    invalidateContainersList: () =>
      queryClient.invalidateQueries({ queryKey: containerQueryKeys.list({}) }),
    invalidateContainerList: (params: Record<string, unknown> = {}) =>
      queryClient.invalidateQueries({ queryKey: containerQueryKeys.list(params) }),
    invalidateContainer: (id: string) =>
      queryClient.invalidateQueries({ queryKey: containerQueryKeys.detail(id) }),
    refetchContainers: () => queryClient.refetchQueries({ queryKey: containerQueryKeys.all }),
    setContainerDetail: (container: ContainerDetail) =>
      queryClient.setQueryData(containerQueryKeys.detail(container.id), container),
  };
};
