import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { exportServiceOrdersApi } from '@/services/apiExportOrders';
import type {
  ExportServiceOrderPackingListAssignPayload,
  ExportServiceOrderPackingListTransferPayload,
  ExportServiceOrderPayload,
  ExportServiceOrderQueryParams,
} from '../types';

export const exportServiceOrderQueryKeys = {
  all: ['exportServiceOrders'] as const,
  lists: () => [...exportServiceOrderQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...exportServiceOrderQueryKeys.lists(), filters] as const,
  details: () => [...exportServiceOrderQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...exportServiceOrderQueryKeys.details(), id] as const,
};

export function useExportServiceOrders(
  params: ExportServiceOrderQueryParams = {},
) {
  return useQuery({
    queryKey: exportServiceOrderQueryKeys.list(params),
    queryFn: async () => {
      const response = await exportServiceOrdersApi.getAll(params);
      return response.data;
    },
    retry: 1,
    placeholderData: keepPreviousData,
  });
}

export function useExportServiceOrder(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: exportServiceOrderQueryKeys.detail(id),
    queryFn: async () => {
      const response = await exportServiceOrdersApi.getById(id);
      return response.data;
    },
    staleTime: 0,
    retry: 1,
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateExportServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ExportServiceOrderPayload) => {
      const response = await exportServiceOrdersApi.create(payload);
      return response.data;
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({
        queryKey: exportServiceOrderQueryKeys.lists(),
      });
      queryClient.setQueryData(
        exportServiceOrderQueryKeys.detail(newOrder.id),
        newOrder,
      );
      toast.success('Export service order saved as draft.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save export service order');
    },
  });
}

export function useUpdateExportServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ExportServiceOrderPayload;
    }) => {
      const response = await exportServiceOrdersApi.update(id, payload);
      return response.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(
        exportServiceOrderQueryKeys.detail(updatedOrder.id),
        updatedOrder,
      );
      queryClient.invalidateQueries({
        queryKey: exportServiceOrderQueryKeys.lists(),
      });
      toast.success('Export service order updated.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update export service order');
    },
  });
}

export function useApproveExportServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await exportServiceOrdersApi.approve(id);
      return response.data;
    },
    onSuccess: (approvedOrder) => {
      queryClient.setQueryData(
        exportServiceOrderQueryKeys.detail(approvedOrder.id),
        approvedOrder,
      );
      queryClient.invalidateQueries({
        queryKey: exportServiceOrderQueryKeys.lists(),
      });
      const code = approvedOrder.code ?? approvedOrder.id;
      toast.success(`Export service order ${code} approved.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve export service order');
    },
  });
}

export function useDeleteExportServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await exportServiceOrdersApi.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({
        queryKey: exportServiceOrderQueryKeys.detail(deletedId),
      });
      queryClient.invalidateQueries({
        queryKey: exportServiceOrderQueryKeys.lists(),
      });
      toast.success('Export service order deleted.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete export service order');
    },
  });
}

export function useAssignExportServiceOrderPackingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ExportServiceOrderPackingListAssignPayload;
    }) => {
      const response = await exportServiceOrdersApi.assignPackingList(id, payload);
      return response.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(
        exportServiceOrderQueryKeys.detail(updatedOrder.id),
        updatedOrder,
      );
      queryClient.invalidateQueries({
        queryKey: exportServiceOrderQueryKeys.lists(),
      });
      toast.success('Packing list assigned.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign packing list');
    },
  });
}

export function useUnassignExportServiceOrderPackingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ExportServiceOrderPackingListAssignPayload;
    }) => {
      const response = await exportServiceOrdersApi.unassignPackingList(id, payload);
      return response.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(
        exportServiceOrderQueryKeys.detail(updatedOrder.id),
        updatedOrder,
      );
      queryClient.invalidateQueries({
        queryKey: exportServiceOrderQueryKeys.lists(),
      });
      toast.success('Packing list removed from order.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unassign packing list');
    },
  });
}

export function useTransferExportServiceOrderPackingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ExportServiceOrderPackingListTransferPayload;
    }) => {
      const response = await exportServiceOrdersApi.transferPackingList(id, payload);
      return response.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(
        exportServiceOrderQueryKeys.detail(updatedOrder.id),
        updatedOrder,
      );
      queryClient.invalidateQueries({
        queryKey: exportServiceOrderQueryKeys.lists(),
      });
      toast.success('Packing list transferred.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to transfer packing list');
    },
  });
}
