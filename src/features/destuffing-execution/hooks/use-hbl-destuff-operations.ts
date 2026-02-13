import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getContainerHblsByIds,
  recordDestuffResult,
} from '@/services/apiDestuffingExecution';
import type { DestuffResult, HblDestuffStatus } from '@/features/destuffing-execution/types';
import { inProgressDestuffingPlanKey } from './use-destuffing-execution';

export const containerHblsQueryKey = (planId: string, containerId: string) =>
  ['destuffing-execution', 'planned-hbls', planId, containerId] as const;

export const containerHblsQueryKeyWithIds = (
  planId: string,
  containerId: string,
  hblIds: string[],
) =>
  [
    ...containerHblsQueryKey(planId, containerId),
    hblIds.slice().sort().join(','),
  ] as const;

export const useContainerHblsQuery = (
  planId: string | undefined,
  containerId: string | undefined,
  hblIds: string[] | undefined,
  containerNumber?: string | undefined | null,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey:
      planId && containerId
        ? containerHblsQueryKeyWithIds(planId, containerId, hblIds ?? [])
        : ['destuffing-execution', 'planned-hbls', '_', '_', '_'],
    enabled:
      Boolean(planId && containerId && hblIds && hblIds.length > 0) &&
      (options.enabled ?? true),
    queryFn: async (): Promise<HblDestuffStatus[]> => {
      if (!planId || !containerId) {
        throw new Error('Plan ID and container ID are required to fetch HBLs');
      }
      const ids = hblIds?.filter(Boolean) ?? [];
      if (ids.length === 0) {
        return [];
      }
      const response = await getContainerHblsByIds(planId, containerId, ids, containerNumber ?? undefined);
      return response.data?.plannedHbls ?? [];
    },
    staleTime: 0,
  });

export const useRecordDestuffResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      containerId,
      hblId,
      payload,
    }: {
      planId: string;
      containerId: string;
      hblId: string;
      payload: {
        document?: DestuffResult['document'] | null;
        image?: DestuffResult['image'] | null;
        note?: string | null;
        onHold: boolean;
        updateMetadataOnly?: boolean;
      };
    }) => recordDestuffResult(planId, containerId, hblId, payload),
    onSuccess: (_, variables) => {
      toast.success('Destuff result saved');

      // Optimistically update cached HBL statuses so "Complete" enables without a manual refresh.
      const nextStatus: HblDestuffStatus['destuffStatus'] = variables.payload.onHold
        ? 'on-hold'
        : 'done';
      const nextResult: NonNullable<HblDestuffStatus['destuffResult']> = {
        timestamp: new Date().toISOString(),
        document: variables.payload.document ?? null,
        image: variables.payload.image ?? null,
        note: variables.payload.note ?? null,
        classification: variables.payload.onHold ? 'on-hold' : 'passed',
        onHoldFlag: variables.payload.onHold,
      };

      const matchingQueries = queryClient.getQueriesData<HblDestuffStatus[]>({
        queryKey: containerHblsQueryKey(variables.planId, variables.containerId),
      });

      matchingQueries.forEach(([queryKey, existing]) => {
        if (!existing) return;
        const updated = existing.map((hbl) =>
          hbl.hblId === variables.hblId
            ? {
              ...hbl,
              destuffStatus: nextStatus,
              destuffResult: nextResult,
            }
            : hbl,
        );
        queryClient.setQueryData(queryKey, updated);
      });

      // Ensure HBL list and container summary refresh so Complete button enables without manual refresh.
      queryClient.invalidateQueries({
        queryKey: containerHblsQueryKey(variables.planId, variables.containerId),
      });
      queryClient.invalidateQueries({
        queryKey: inProgressDestuffingPlanKey(variables.planId),
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });
};
