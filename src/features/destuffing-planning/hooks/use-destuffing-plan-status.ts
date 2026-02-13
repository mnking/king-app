import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { changePlanStatus } from '@/services/apiCFSPlanning';
import type { ChangePlanStatusRequest } from '@/shared/features/plan/types';
import { destuffingPlanQueryKeys } from './use-destuffing-plans-query';
import { pendingDestuffingPlansKeys } from './use-pending-destuffing-plans';
import { inProgressDestuffingPlanQueryKey } from './use-in-progress-destuffing-plans';

interface DestuffingPlanStatusPayload {
  id: string;
  data: ChangePlanStatusRequest;
}

export function useDestuffingPlanStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: DestuffingPlanStatusPayload) => {
      const response = await changePlanStatus(id, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Plan status updated.');
      queryClient.invalidateQueries({ queryKey: destuffingPlanQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: pendingDestuffingPlansKeys.all });
      queryClient.invalidateQueries({ queryKey: inProgressDestuffingPlanQueryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update plan status.');
    },
  });
}
