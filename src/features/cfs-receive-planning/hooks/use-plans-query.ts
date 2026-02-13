import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as api from '@/services/apiCFSPlanning';
import {
  inProgressPlanQueryKey,
  planQueryKeys,
  unplannedQueryKeys,
} from '@/shared/features/plan/query-keys';
import type {
  ReceivePlan,
  PlansQueryParams,
  CreatePlanRequest,
  UpdatePlanRequest,
  ChangePlanStatusRequest,
  PaginatedResponse,
  EnrichedUnplannedContainer,
} from '@/shared/features/plan/types';
import { enrichContainers } from '@/shared/features/plan/utils/enrich-containers';

// ===========================
// Query Hooks
// ===========================

/**
 * Fetch paginated list of plans with optional filtering
 */
export function usePlans(params: PlansQueryParams = {}) {
  return useQuery({
    queryKey: planQueryKeys.list(params),
    queryFn: async () => {
      const response = await api.getPlans({
        ...params,
        planType: params.planType ?? 'RECEIVING',
      });
      return response; // Already unwrapped PaginatedResponse
    },
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch single plan by ID
 */
export function usePlan(id: string) {
  return useQuery({
    queryKey: planQueryKeys.detail(id),
    queryFn: async () => {
      const response = await api.getPlanById(id);
      return response.data;
    },
    retry: 1,
    enabled: !!id,
  });
}

/**
 * Enriched Receive Plan - Plan with enriched container data
 */
export interface EnrichedReceivePlan extends Omit<ReceivePlan, 'containers'> {
  containers: Array<Omit<ReceivePlan['containers'][0], 'orderContainer'> & {
    orderContainer: EnrichedUnplannedContainer;
  }>;
}

/**
 * Fetch paginated list of plans with enriched container data
 * This hook enriches plan containers with booking order and HBL details
 */
export function useEnrichedPlans(
  params: PlansQueryParams = {},
  options?: Partial<
    UseQueryOptions<
      PaginatedResponse<EnrichedReceivePlan>,
      Error,
      PaginatedResponse<EnrichedReceivePlan>,
      ReturnType<typeof planQueryKeys.list>
    >
  >,
) {
  return useQuery({
    queryKey: [...planQueryKeys.list(params), 'enriched'],
    queryFn: async (): Promise<PaginatedResponse<EnrichedReceivePlan>> => {
      // 1. Fetch plans
      const plansData = await api.getPlans({
        ...params,
        planType: params.planType ?? 'RECEIVING',
      }); // Already unwrapped PaginatedResponse

      // 2. Extract all containers from all plans
      const allContainers = plansData.results.flatMap(plan =>
        plan.containers.map(pc => pc.orderContainer)
      );

      // 3. Enrich all containers at once (deduplication happens inside enrichContainers)
      const enrichedContainers = await enrichContainers(allContainers);

      // 4. Create a map for quick lookup
      const enrichedMap = new Map(
        enrichedContainers.map(ec => [ec.id, ec])
      );

      // 5. Map enriched containers back to plans
      const enrichedPlans: EnrichedReceivePlan[] = plansData.results.map(plan => ({
        ...plan,
        containers: plan.containers.map(pc => ({
          ...pc,
          orderContainer: enrichedMap.get(pc.orderContainer.id) || pc.orderContainer as EnrichedUnplannedContainer,
        })),
      }));

      return {
        ...plansData,
        results: enrichedPlans,
      };
    },
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });
}

/**
 * Specialized hook for DONE plans with enriched container data
 * Accepts future filter params but currently only status is sent to backend
 */
export function useDonePlansHistory(params: PlansQueryParams = {}) {
  return useEnrichedPlans(
    {
      ...params,
      status: 'DONE',
      planType: params.planType ?? 'RECEIVING',
    },
    {
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
      // staleTime: 0,
    },
  );
}

/**
 * Specialized hook for PENDING plans monitoring with enriched container data
 * Accepts future filter params but currently only status is sent to backend
 */
export function usePendingPlansMonitoring(params: PlansQueryParams = {}) {
  return useEnrichedPlans(
    {
      ...params,
      status: 'PENDING',
      planType: params.planType ?? 'RECEIVING',
    },
    {
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
      // staleTime: 0,
    },
  );
}

// ===========================
// Mutation Hooks
// ===========================

/**
 * Create new receive plan
 */
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlanRequest) => {
      const response = await api.createPlan({
        planType: 'RECEIVING',
        ...data,
      });
      return response.data;
    },
    onSuccess: (newPlan) => {
      // Invalidate all plan lists
      queryClient.invalidateQueries({ queryKey: planQueryKeys.lists() });

      // Invalidate unplanned containers query (containers removed from unplanned)
      queryClient.invalidateQueries({ queryKey: unplannedQueryKeys.all });

      // Set the detail query data for the new plan
      queryClient.setQueryData(
        planQueryKeys.detail(newPlan.id),
        newPlan,
      );

      toast.success('Plan created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create plan');
    },
  });
}

/**
 * Update existing receive plan
 */
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePlanRequest;
    }) => {
      const response = await api.updatePlan(id, data);
      return response.data;
    },
    onSuccess: (updatedPlan) => {
      // Update specific plan in cache
      queryClient.setQueryData(
        planQueryKeys.detail(updatedPlan.id),
        updatedPlan,
      );

      // Update plan in lists
      queryClient.setQueriesData<PaginatedResponse<ReceivePlan>>(
        { queryKey: planQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.map((plan) =>
                plan.id === updatedPlan.id ? updatedPlan : plan,
              ),
            };
          }
          return oldData;
        },
      );

      // Invalidate all plan lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: planQueryKeys.lists() });

      toast.success('Plan updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update plan');
    },
  });
}

/**
 * Delete receive plan (SCHEDULED plans only)
 */
export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.deletePlan(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: planQueryKeys.detail(deletedId),
      });

      // Update plan lists
      queryClient.setQueriesData<PaginatedResponse<ReceivePlan>>(
        { queryKey: planQueryKeys.lists() },
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              results: oldData.results.filter((plan) => plan.id !== deletedId),
              total: oldData.total - 1,
            };
          }
          return oldData;
        },
      );

      // Invalidate unplanned containers (containers returned to unplanned)
      queryClient.invalidateQueries({ queryKey: unplannedQueryKeys.all });

      // Invalidate all queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: planQueryKeys.all });

      toast.success('Plan deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete plan');
    },
  });
}

/**
 * Change plan status (e.g., SCHEDULED → DONE)
 */
export function useChangePlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ChangePlanStatusRequest;
    }) => {
      const response = await api.changePlanStatus(id, data);
      return response.data;
    },
    onSuccess: (updatedPlan) => {
      // Update specific plan in cache
      queryClient.setQueryData(
        planQueryKeys.detail(updatedPlan.id),
        updatedPlan,
      );

      // Invalidate all plan lists (plan may move between SCHEDULED/DONE lists)
      queryClient.invalidateQueries({ queryKey: planQueryKeys.lists() });

      // Invalidate IN_PROGRESS plan query (used by minimap)
      queryClient.invalidateQueries({ queryKey: inProgressPlanQueryKey });

      // Invalidate specific plan detail query (to refresh executionStart/executionEnd)
      queryClient.invalidateQueries({ queryKey: planQueryKeys.detail(updatedPlan.id) });

      toast.success('Plan status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to change plan status');
    },
  });
}

// ===========================
// Utility Hooks
// ===========================

/**
 * Utility hook for plan-related query operations
 */
export function usePlanQueries() {
  const queryClient = useQueryClient();

  return {
    invalidatePlans: () =>
      queryClient.invalidateQueries({ queryKey: planQueryKeys.all }),
    invalidatePlansList: () =>
      queryClient.invalidateQueries({ queryKey: planQueryKeys.lists() }),
    invalidatePlan: (id: string) =>
      queryClient.invalidateQueries({ queryKey: planQueryKeys.detail(id) }),
    refetchPlans: () =>
      queryClient.refetchQueries({ queryKey: planQueryKeys.all }),
  };
}
