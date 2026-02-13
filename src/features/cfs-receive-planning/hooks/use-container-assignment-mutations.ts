import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as api from '@/services/apiCFSPlanning';
import { planQueryKeys, unplannedQueryKeys } from '@/shared/features/plan/query-keys';

/**
 * Assign container to a plan
 * POST /v1/plans/{planId}/container-assignments
 */
export function useAssignContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      orderContainerId,
    }: {
      planId: string;
      orderContainerId: string;
    }) => {
      await api.assignContainer(planId, [{ orderContainerId }]);
      return { planId, orderContainerId };
    },
    onSuccess: ({ planId }) => {
      // Invalidate the specific plan's details
      queryClient.invalidateQueries({ queryKey: planQueryKeys.detail(planId) });

      // Invalidate all plan lists (to update counts and containers)
      queryClient.invalidateQueries({ queryKey: planQueryKeys.lists() });

      // Invalidate unplanned containers (container removed from unplanned)
      queryClient.invalidateQueries({ queryKey: unplannedQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign container to plan');
      throw error; // Re-throw to allow caller to handle
    },
  });
}

/**
 * Unassign container from a plan
 * DELETE /v1/plans/{planId}/container-assignments/{assignmentId}
 */
export function useUnassignContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      assignmentId,
    }: {
      planId: string;
      assignmentId: string;
    }) => {
      await api.unassignContainer(planId, assignmentId);
      return { planId, assignmentId };
    },
    onSuccess: ({ planId }) => {
      // Invalidate the specific plan's details
      queryClient.invalidateQueries({ queryKey: planQueryKeys.detail(planId) });

      // Invalidate all plan lists (to update counts and containers)
      queryClient.invalidateQueries({ queryKey: planQueryKeys.lists() });

      // Invalidate unplanned containers (container returned to unplanned)
      queryClient.invalidateQueries({ queryKey: unplannedQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unassign container from plan');
      throw error; // Re-throw to allow caller to handle
    },
  });
}
