import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  unassignContainer,
  assignContainer,
  type AssignContainerRequest,
} from '@/services/apiCFSPlanning';
import { destuffingPlanQueryKeys } from './use-destuffing-plans-query';
import { unplannedDestuffingQueryKeys } from './use-unplanned-destuffing-query';

interface AssignPayload {
  planId: string;
  orderContainerIds: string[];
}

interface UnassignPayload {
  planId: string;
  assignmentId: string;
}

export function useAssignDestuffingContainers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, orderContainerIds }: AssignPayload) => {
      const assignments: AssignContainerRequest[] = orderContainerIds.map(
        (orderContainerId) => ({
          orderContainerId,
          hblIds: [],
        }),
      );
      await assignContainer(planId, assignments);
      return { planId, orderContainerIds };
    },
    onSuccess: () => {
      toast.success('Containers assigned to plan.');
      queryClient.invalidateQueries({ queryKey: destuffingPlanQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: unplannedDestuffingQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign containers.');
    },
  });
}

export function useUnassignDestuffingContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, assignmentId }: UnassignPayload) => {
      await unassignContainer(planId, assignmentId);
      return { planId, assignmentId };
    },
    onSuccess: () => {
      toast.success('Container removed from plan.');
      queryClient.invalidateQueries({ queryKey: destuffingPlanQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: unplannedDestuffingQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove container from plan.');
    },
  });
}
