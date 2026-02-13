import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  completeContainer,
  unsealContainer,
} from '@/services/apiDestuffingExecution';
import type { DestuffingPlan } from '@/features/destuffing-execution/types';
import { destuffingPlanExecutionQueryKey } from '@/features/destuffing-planning/hooks/use-destuffing-plan-execution';
import { inProgressDestuffingPlanKey } from './use-destuffing-execution';
import { inProgressDestuffingPlanQueryKey } from './use-in-progress-destuffing-plans';

const invalidatePlan = (queryClient: ReturnType<typeof useQueryClient>, planId: string) =>
  queryClient.invalidateQueries({ queryKey: inProgressDestuffingPlanKey(planId) });

export const useUnsealContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      containerId,
      unsealedAt,
    }: {
      planId: string;
      containerId: string;
      unsealedAt?: string;
    }) => unsealContainer(planId, containerId, unsealedAt),
    onSuccess: (response, variables) => {
      toast.success('Container unsealed');
      const updatedContainer = response?.data
        ? {
            ...response.data,
            workingStatus:
              response.data.workingStatus ??
              (response.data.status === 'IN_PROGRESS'
                ? 'in-progress'
                : response.data.status === 'WAITING'
                  ? 'waiting'
                  : response.data.status === 'DONE'
                    ? 'done'
                    : response.data.status === 'ON_HOLD'
                      ? 'on-hold'
                      : response.data.workingStatus),
          }
        : undefined;

      queryClient.setQueryData<DestuffingPlan[]>(inProgressDestuffingPlanQueryKey, (previous) =>
        previous
          ? previous.map((plan) =>
              plan.id === variables.planId
                ? {
                    ...plan,
                    containers: plan.containers.map((container) =>
                      container.id === variables.containerId
                        ? { ...container, ...updatedContainer }
                        : container,
                    ),
                  }
                : plan,
            )
          : previous,
      );

      queryClient.setQueryData<DestuffingPlan>(
        inProgressDestuffingPlanKey(variables.planId),
        (previousPlan) =>
          previousPlan
            ? {
                ...previousPlan,
                containers: previousPlan.containers.map((container) =>
                  container.id === variables.containerId
                    ? { ...container, ...updatedContainer }
                    : container,
                ),
              }
            : previousPlan,
      );

      invalidatePlan(queryClient, variables.planId);
      queryClient.invalidateQueries({
        queryKey: destuffingPlanExecutionQueryKey(variables.planId),
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

export const useResealContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      containerId,
      newSealNumber,
      onHoldFlag: _onHoldFlag,
      note,
    }: {
      planId: string;
      containerId: string;
      newSealNumber: string;
      onHoldFlag: boolean;
      note?: string | null;
    }) => completeContainer(planId, containerId, { sealNumber: newSealNumber, notes: note }),
    onSuccess: (_, variables) => {
      toast.success('Container resealed');
      invalidatePlan(queryClient, variables.planId);
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

export const useCompleteContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      containerId,
      occurredAt,
      notes,
    }: {
      planId: string;
      containerId: string;
      occurredAt?: string | null;
      notes?: string | null;
    }) => completeContainer(planId, containerId, { occurredAt, notes }),
    onSuccess: (response, variables) => {
      toast.success('Container completed');

      const workingStatus =
        response?.data?.workingStatus ??
        (response?.data?.cargoLoadedStatus === 'empty' ? 'done' : 'done');
      const cargoLoadedStatus = response?.data?.cargoLoadedStatus ?? 'empty';

      queryClient.setQueryData<DestuffingPlan[]>(inProgressDestuffingPlanQueryKey, (previous) =>
        previous
          ? previous.map((plan) =>
              plan.id === variables.planId
                ? {
                    ...plan,
                    containers: plan.containers.map((container) =>
                      container.id === variables.containerId
                        ? {
                            ...container,
                            workingStatus,
                            cargoLoadedStatus,
                          }
                        : container,
                    ),
                  }
                : plan,
            )
          : previous,
      );

      queryClient.setQueryData<DestuffingPlan>(
        inProgressDestuffingPlanKey(variables.planId),
        (previousPlan) =>
          previousPlan
            ? {
                ...previousPlan,
                containers: previousPlan.containers.map((container) =>
                  container.id === variables.containerId
                    ? {
                        ...container,
                        workingStatus,
                        cargoLoadedStatus,
                      }
                    : container,
                ),
              }
            : previousPlan,
      );

      invalidatePlan(queryClient, variables.planId);
    },
    onError: (error: Error) => toast.error(error.message),
  });
};
