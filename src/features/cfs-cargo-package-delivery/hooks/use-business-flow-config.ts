import { useQuery } from '@tanstack/react-query';
import {
  cargoInspectionApi,
  type BusinessFlowConfig,
} from '@/services/apiCargoInspection';

export const businessFlowQueryKeys = {
  all: ['business-flow-config'] as const,
  byName: (flowName: string) =>
    [...businessFlowQueryKeys.all, flowName] as const,
};

export function useBusinessFlowConfig(flowName: string | null | undefined) {
  return useQuery({
    queryKey: businessFlowQueryKeys.byName(flowName ?? '_'),
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
