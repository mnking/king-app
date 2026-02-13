import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { packingListsApi } from '@/services/apiPackingLists';
import type {
  PackingListLineCreatePayload,
  PackingListLineUpdatePayload,
} from '../types';
import { packingListQueryKeys } from './use-packing-lists';

export const packingListLineQueryKeys = {
  all: ['packing-list-lines'] as const,
  lists: () => [...packingListLineQueryKeys.all, 'list'] as const,
  list: (packingListId: string, page: number, itemsPerPage: number) =>
    [...packingListLineQueryKeys.lists(), packingListId, page, itemsPerPage] as const,
};

export function usePackingListLines(
  packingListId: string,
  page: number = 1,
  itemsPerPage: number = 10,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: packingListLineQueryKeys.list(packingListId, page, itemsPerPage),
    queryFn: async () => {
      const response = await packingListsApi.lines.getAll(
        packingListId,
        page,
        itemsPerPage,
      );
      return response.data;
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    enabled: !!packingListId && (options?.enabled ?? true),
  });
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
};

export interface PersistLineBatchInput {
  packingListId: string;
  toCreate: PackingListLineCreatePayload[];
  toUpdate: Array<{
    lineId: string;
    payload: PackingListLineUpdatePayload;
  }>;
  toDelete: string[];
}

export function usePersistPackingListLineBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packingListId,
      toCreate,
      toUpdate,
      toDelete,
    }: PersistLineBatchInput) => {
      for (const lineId of toDelete) {
        try {
          await packingListsApi.lines.delete(lineId);
        } catch (error) {
          throw new Error(getErrorMessage(error));
        }
      }

      for (const { lineId, payload } of toUpdate) {
        try {
          await packingListsApi.lines.update(lineId, payload);
        } catch (error) {
          throw new Error(getErrorMessage(error));
        }
      }

      for (const payload of toCreate) {
        try {
          await packingListsApi.lines.create(packingListId, payload);
        } catch (error) {
          throw new Error(getErrorMessage(error));
        }
      }

      return { packingListId };
    },
    onSuccess: ({ packingListId }) => {
      queryClient.invalidateQueries({
        queryKey: packingListLineQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: packingListQueryKeys.detail(packingListId),
      });
    },
  });
}
