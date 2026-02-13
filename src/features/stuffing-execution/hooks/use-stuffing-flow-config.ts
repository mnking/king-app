import { useQuery } from '@tanstack/react-query';
import {
  cargoInspectionApi,
  type BusinessFlowConfig,
} from '@/services/apiCargoInspection';

export const stuffingFlowQueryKeys = {
  all: ['stuffing-execution', 'flow-config'] as const,
  byName: (flowName: string) => [...stuffingFlowQueryKeys.all, flowName] as const,
};

export function useStuffingFlowConfig(flowName: string | null | undefined) {
  return useQuery({
    queryKey: stuffingFlowQueryKeys.byName(flowName ?? '_'),
    queryFn: async (): Promise<BusinessFlowConfig> => {
      const response = await cargoInspectionApi.getFlowConfig(flowName ?? '');
      return response.data;
    },
    enabled: Boolean(flowName),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
}
