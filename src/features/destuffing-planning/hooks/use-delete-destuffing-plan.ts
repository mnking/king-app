import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { deletePlan } from '@/services/apiCFSPlanning';
import { destuffingPlanQueryKeys } from './use-destuffing-plans-query';
import { unplannedDestuffingQueryKeys } from './use-unplanned-destuffing-query';

export function useDeleteDestuffingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      await deletePlan(planId);
      return planId;
    },
    onSuccess: (planId) => {
      toast.success('Destuffing plan deleted.');
      queryClient.invalidateQueries({ queryKey: destuffingPlanQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: unplannedDestuffingQueryKeys.all });
      queryClient.removeQueries({
        queryKey: [...destuffingPlanQueryKeys.all, 'detail', planId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete destuffing plan.');
    },
  });
}
