import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { exportPlansApi } from '@/services/apiExportPlans';
import type {
  ExportPlan,
  ExportPlanContainer,
  ExportPlanContainerPayload,
  ExportPlanContainerStatusPayload,
  ExportPlanCreatePayload,
  ExportPlanPackingListAssignmentPayload,
  ExportPlanQueryParams,
  ExportPlanStatusPayload,
  ExportPlanUpdatePayload,
} from '../types';

export const exportPlanQueryKeys = {
  all: ['exportPlans'] as const,
  lists: () => [...exportPlanQueryKeys.all, 'list'] as const,
  list: (params: ExportPlanQueryParams) =>
    [...exportPlanQueryKeys.lists(), params] as const,
  details: () => [...exportPlanQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...exportPlanQueryKeys.details(), id] as const,
};

export const useExportPlans = (params: ExportPlanQueryParams) =>
  useQuery({
    queryKey: exportPlanQueryKeys.list(params),
    queryFn: () => exportPlansApi.getAll(params),
    placeholderData: keepPreviousData,
    retry: 1,
  });

export const useExportPlan = (id: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: exportPlanQueryKeys.detail(id),
    queryFn: () => exportPlansApi.getById(id),
    enabled: options?.enabled ?? !!id,
    retry: 1,
  });

export const useCreateExportPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ExportPlanCreatePayload) =>
      exportPlansApi.create(payload),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.lists(),
      });
      queryClient.setQueryData(exportPlanQueryKeys.detail(plan.id), plan);
      toast.success('Stuffing plan created.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create stuffing plan');
    },
  });
};

export const useUpdateExportPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ExportPlanUpdatePayload;
    }) => exportPlansApi.update(id, payload),
    onSuccess: (plan) => {
      queryClient.setQueryData(exportPlanQueryKeys.detail(plan.id), plan);
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.lists(),
      });
      toast.success('Stuffing plan updated.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update stuffing plan');
    },
  });
};

export const useDeleteExportPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => exportPlansApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: exportPlanQueryKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.lists(),
      });
      toast.success('Stuffing plan deleted.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete stuffing plan');
    },
  });
};

export const useChangeExportPlanStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ExportPlanStatusPayload;
    }) => exportPlansApi.changeStatus(id, payload),
    onSuccess: (plan) => {
      queryClient.setQueryData(exportPlanQueryKeys.detail(plan.id), plan);
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.lists(),
      });
      toast.success('Plan status updated.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update plan status');
    },
  });
};

export const useCreateExportPlanContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      payload,
    }: {
      planId: string;
      payload: ExportPlanContainerPayload;
    }) => exportPlansApi.createContainer(planId, payload),
    onSuccess: (container, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.detail(planId),
      });
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.lists(),
      });
      toast.success('Container added.');
      return container;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add container');
    },
  });
};

export const useUpdateExportPlanContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      containerId,
      payload,
    }: {
      planId: string;
      containerId: string;
      payload: ExportPlanContainerPayload;
    }) => exportPlansApi.updateContainer(planId, containerId, payload),
    onSuccess: (container, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.detail(planId),
      });
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.lists(),
      });
      toast.success('Container updated.');
      return container;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update container');
    },
  });
};

export const useDeleteExportPlanContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      containerId,
    }: {
      planId: string;
      containerId: string;
    }) => exportPlansApi.deleteContainer(planId, containerId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.detail(planId),
      });
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.lists(),
      });
      toast.success('Container deleted.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete container');
    },
  });
};

export const useChangeExportPlanContainerStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      containerId,
      payload,
    }: {
      planId: string;
      containerId: string;
      payload: ExportPlanContainerStatusPayload;
    }) =>
      exportPlansApi.changeContainerStatus(planId, containerId, payload),
    onSuccess: (container, { planId }) => {
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.detail(planId),
      });
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.lists(),
      });
      toast.success('Container status updated.');
      return container;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update container status');
    },
  });
};

export const useAssignExportPlanPackingLists = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      payload,
    }: {
      planId: string;
      payload: ExportPlanPackingListAssignmentPayload;
    }) => exportPlansApi.assignPackingLists(planId, payload),
    onSuccess: (plan) => {
      queryClient.setQueryData(exportPlanQueryKeys.detail(plan.id), plan);
      queryClient.invalidateQueries({
        queryKey: exportPlanQueryKeys.lists(),
      });
      toast.success('Packing list assignments updated.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update packing list assignments');
    },
  });
};

export type ExportPlanMutationResult = ExportPlan | ExportPlanContainer | null;
