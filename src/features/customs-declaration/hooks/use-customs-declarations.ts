import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { customsDeclarationsApi } from '@/services/apiCustomsDeclarations';
import type {
  CustomsDeclarationCreatePayload,
  CustomsDeclarationsListQueryParams,
  CustomsDeclarationsListResponse,
  CustomsDeclarationResponse,
  CustomsDeclarationUpdatePayload,
} from '../types';

export const customsDeclarationQueryKeys = {
  all: ['customs-declarations'] as const,
  lists: () => [...customsDeclarationQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...customsDeclarationQueryKeys.lists(), filters] as const,
  details: () => [...customsDeclarationQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...customsDeclarationQueryKeys.details(), id] as const,
};

export function useCustomsDeclarations(
  params: CustomsDeclarationsListQueryParams = {},
  options?: { enabled?: boolean; staleTime?: number },
) {
  return useQuery({
    queryKey: customsDeclarationQueryKeys.list(params),
    queryFn: async (): Promise<CustomsDeclarationsListResponse> => {
      const response = await customsDeclarationsApi.getAll(params);
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 30_000,
    retry: 1,
  });
}

export function useCustomsDeclaration(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: id ? customsDeclarationQueryKeys.detail(id) : ['customs-declarations', 'detail', 'none'],
    queryFn: async () => {
      if (!id) {
        throw new Error('Customs declaration id is required');
      }
      return customsDeclarationsApi.getById(id);
    },
    enabled: !!id && (options?.enabled ?? true),
    retry: 1,
  });
}

export function useCreateCustomsDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CustomsDeclarationCreatePayload) =>
      customsDeclarationsApi.create(payload),
    onSuccess: (created: CustomsDeclarationResponse) => {
      queryClient.setQueryData(
        customsDeclarationQueryKeys.detail(created.id),
        created,
      );
      queryClient.invalidateQueries({ queryKey: customsDeclarationQueryKeys.lists() });
      toast.success('Customs declaration saved as draft');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create customs declaration');
    },
  });
}

export function useUpdateCustomsDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: CustomsDeclarationUpdatePayload;
    }) => customsDeclarationsApi.update(id, payload),
    onSuccess: (updated: CustomsDeclarationResponse) => {
      queryClient.setQueryData(
        customsDeclarationQueryKeys.detail(updated.id),
        updated,
      );
      queryClient.invalidateQueries({ queryKey: customsDeclarationQueryKeys.lists() });
      toast.success('Customs declaration updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update customs declaration');
    },
  });
}

export function useApproveCustomsDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => customsDeclarationsApi.approve(id),
    onSuccess: (approved: CustomsDeclarationResponse) => {
      queryClient.setQueryData(
        customsDeclarationQueryKeys.detail(approved.id),
        approved,
      );
      queryClient.invalidateQueries({ queryKey: customsDeclarationQueryKeys.lists() });
      toast.success('Customs declaration approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve customs declaration');
    },
  });
}

export function useDeleteCustomsDeclaration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await customsDeclarationsApi.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({
        queryKey: customsDeclarationQueryKeys.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: customsDeclarationQueryKeys.lists() });
      toast.success('Customs declaration deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete customs declaration');
    },
  });
}
