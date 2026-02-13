import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { updatePlan } from '@/services/apiCFSPlanning';
import type { UpdatePlanRequest } from '@/shared/features/plan/types';
import type { DestuffingPlan } from '../types';
import { destuffingPlanQueryKeys } from './use-destuffing-plans-query';
import { unplannedDestuffingQueryKeys } from './use-unplanned-destuffing-query';

interface UpdateDestuffingPlanPayload {
  id: string;
  data: UpdatePlanRequest;
}

export function useUpdateDestuffingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateDestuffingPlanPayload) => {
      const response = await updatePlan(id, data);
      return response.data as DestuffingPlan;
    },
    onSuccess: (updatedPlan) => {
      toast.success('Destuffing plan updated.');
      queryClient.invalidateQueries({ queryKey: destuffingPlanQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: unplannedDestuffingQueryKeys.all });
      if (updatedPlan?.id) {
        queryClient.setQueryData(
          [...destuffingPlanQueryKeys.all, 'detail', updatedPlan.id],
          updatedPlan,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update destuffing plan.');
    },
  });
}
