import { useQuery } from '@tanstack/react-query';
import {
  containerTypesApi,
  listContainerTypes,
} from '@/services/apiContainerTypes';
import {
  ContainerType,
  ContainerTypeCreateForm,
  ContainerTypeUpdateForm,
} from '../types';
import { createEntityHook } from '@/shared/hooks/useCrudOperations';

export const containerTypesQueryKeys = {
  all: ['containerTypes'] as const,
  lists: () => [...containerTypesQueryKeys.all, 'list'] as const,
  details: () => [...containerTypesQueryKeys.all, 'detail'] as const,
  detail: (code: string) => [...containerTypesQueryKeys.details(), code] as const,
};

export const useContainerTypes = createEntityHook<
  ContainerType,
  ContainerTypeCreateForm,
  ContainerTypeUpdateForm
>({
  queryKey: containerTypesQueryKeys.all,
  api: {
    getAll: async () => {
      const response = await listContainerTypes();
      return response.data?.results ?? [];
    },
    create: async (payload: ContainerTypeCreateForm) => {
      const response = await containerTypesApi.create(payload);
      return response.data;
    },
    update: async (code: string, payload: ContainerTypeUpdateForm) => {
      const response = await containerTypesApi.update(code, payload);
      return response.data;
    },
    delete: async (code: string) => {
      await containerTypesApi.delete(code);
      return { data: true, error: null };
    },
  },
  getId: (type) => type.id ?? type.code,
});

export const useContainerTypeList = () =>
  useQuery({
    queryKey: containerTypesQueryKeys.lists(),
    queryFn: async () => {
      const response = await listContainerTypes();
      return response.data;
    },
staleTime:0,
  });

export const useContainerType = (code: string) =>
  useQuery({
    queryKey: containerTypesQueryKeys.detail(code),
    queryFn: async () => {
      const response = await containerTypesApi.getByCode(code);
      return response.data;
    },
    enabled: Boolean(code),
staleTime:0,
  });
