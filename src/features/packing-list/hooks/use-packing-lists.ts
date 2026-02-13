import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { packingListsApi } from '@/services/apiPackingLists';
import type {
  PackingListCreatePayload,
  PackingListDetail,
  PackingListListItem,
  PackingListQueryParams,
  PackingListUpdatePayload,
  SaveAsDraftPayload,
  SaveAsPartialPayload,
  PaginatedResponse,
  UpdateDocumentStatusPayload,
} from '../types';

export const packingListQueryKeys = {
  all: ['packing-lists'] as const,
  lists: () => [...packingListQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...packingListQueryKeys.lists(), filters] as const,
  details: () => [...packingListQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...packingListQueryKeys.details(), id] as const,
};

export function usePackingLists(params: PackingListQueryParams = {}) {
  return useQuery({
    queryKey: packingListQueryKeys.list(params),
    queryFn: async () => {
      const response = await packingListsApi.getAll(params);
      return response.data;
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
}

export function usePackingList(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: packingListQueryKeys.detail(id),
    queryFn: async () => {
      const response = await packingListsApi.getById(id);
      return response.data;
    },
    retry: 1,
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useCreatePackingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PackingListCreatePayload) => {
      const response = await packingListsApi.create(payload);
      return response.data;
    },
    onSuccess: (created: PackingListDetail) => {
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
      queryClient.setQueryData(
        packingListQueryKeys.detail(created.id),
        created,
      );
      toast.success('Packing list saved as draft');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create packing list');
    },
  });
}

export function useUpdatePackingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: PackingListUpdatePayload;
    }) => {
      const response = await packingListsApi.update(id, payload);
      return response.data;
    },
    onSuccess: (updated: PackingListDetail) => {
      queryClient.setQueryData(
        packingListQueryKeys.detail(updated.id),
        updated,
      );
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
      toast.success('Packing list updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update packing list');
    },
  });
}

export function useUpdatePackingListDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateDocumentStatusPayload;
    }) => {
      const response = await packingListsApi.updateDocumentStatus(id, payload);
      return response.data;
    },
    onSuccess: (updated: PackingListDetail) => {
      queryClient.setQueryData(
        packingListQueryKeys.detail(updated.id),
        updated,
      );
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
      toast.success('Document status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update document status');
    },
  });
}

export function useSavePackingListDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: SaveAsDraftPayload;
    }) => {
      const response = await packingListsApi.saveDraft(id, payload);
      return response.data;
    },
    onSuccess: (draft: PackingListDetail) => {
      queryClient.setQueryData(packingListQueryKeys.detail(draft.id), draft);
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
      toast.success('Draft saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save draft');
    },
  });
}

export function useSavePackingListPartial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: SaveAsPartialPayload;
    }) => {
      const response = await packingListsApi.savePartial(id, payload);
      return response.data;
    },
    onSuccess: (partial: PackingListDetail) => {
      queryClient.setQueryData(
        packingListQueryKeys.detail(partial.id),
        partial,
      );
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
      toast.success('Packing list saved as partial');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save as partial');
    },
  });
}

export function useApprovePackingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await packingListsApi.approve(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.detail(id) });
      toast.success('Packing list approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve packing list');
    },
  });
}

export function useDeletePackingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await packingListsApi.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: packingListQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() });
      toast.success('Packing list deleted');
    },
  });
}

export const usePackingListQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateLists: () =>
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.lists() }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: packingListQueryKeys.detail(id) }),
    setDetail: (packingList: PackingListDetail) =>
      queryClient.setQueryData(
        packingListQueryKeys.detail(packingList.id),
        packingList,
      ),
    setList: (
      filters: Record<string, unknown>,
      updater: (
        current: PaginatedResponse<PackingListListItem> | undefined,
      ) => PaginatedResponse<PackingListListItem> | undefined,
    ) =>
      queryClient.setQueryData(
        packingListQueryKeys.list(filters),
        updater,
      ),
  };
};
