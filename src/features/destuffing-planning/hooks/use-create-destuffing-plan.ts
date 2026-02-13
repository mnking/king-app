import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createPlan } from '@/services/apiCFSPlanning';
import type { CreatePlanRequest } from '@/shared/features/plan/types';
import { destuffingPlanQueryKeys } from './use-destuffing-plans-query';
import { unplannedDestuffingQueryKeys } from './use-unplanned-destuffing-query';

type CreateDestuffingPlanRequest = CreatePlanRequest & {
  planType: 'DESTUFFING';
};

interface DestuffingHblSelectionPayload {
  orderContainerId: string;
  hblIds: string[]; // Simplified: just array of HBL IDs
}

interface CreateDestuffingPlanPayload {
  planData: Omit<CreateDestuffingPlanRequest, 'containers'>;
  hblSelections: DestuffingHblSelectionPayload[];
}

export function useCreateDestuffingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planData, hblSelections }: CreateDestuffingPlanPayload) => {
      // One-step creation: include hblIds directly in containers array
      const createRequest: CreateDestuffingPlanRequest = {
        ...planData,
        containers: hblSelections
          .filter((selection) => selection.hblIds.length > 0)
          .map((selection) => ({
            orderContainerId: selection.orderContainerId,
            hblIds: selection.hblIds,
          })),
      };

      const response = await createPlan(createRequest);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Destuffing plan created successfully.');
      queryClient.invalidateQueries({ queryKey: destuffingPlanQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: unplannedDestuffingQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create destuffing plan.');
    },
  });
}
