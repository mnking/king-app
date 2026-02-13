import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { cargoInspectionApi } from '@/services/apiCargoInspection';
import type { CargoInspectionSession, FlowType } from '../types';

const normalizeSessions = (
  data: CargoInspectionSession[] | { results?: CargoInspectionSession[] } | undefined,
) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { results?: CargoInspectionSession[] }).results)) {
    return (data as { results: CargoInspectionSession[] }).results;
  }
  return [];
};

export const cargoInspectionQueryKeys = {
  all: ['cargo-inspection'] as const,
  sessions: {
    root: () => [...cargoInspectionQueryKeys.all, 'sessions'] as const,
    list: (packingListId: string, flowType?: FlowType) =>
      [...cargoInspectionQueryKeys.sessions.root(), { packingListId, flowType }] as const,
  },
  lines: {
    root: () => [...cargoInspectionQueryKeys.all, 'lines'] as const,
    bySession: (sessionId: string) =>
      [...cargoInspectionQueryKeys.lines.root(), sessionId] as const,
    detail: (lineInspectionId: string) =>
      [...cargoInspectionQueryKeys.lines.root(), 'detail', lineInspectionId] as const,
  },
  packages: (packingListId: string) =>
    [...cargoInspectionQueryKeys.all, 'packages', packingListId] as const,
};

export function useCargoInspectionSessions(
  packingListId: string,
  flowType?: FlowType,
) {
  return useQuery({
    queryKey: cargoInspectionQueryKeys.sessions.list(packingListId, flowType),
    queryFn: async () => {
      const response = await cargoInspectionApi.getSessions(
        packingListId,
        flowType,
      );
      return normalizeSessions(response.data);
    },
    enabled: Boolean(packingListId),
    retry: 1,
  });
}

export function useCreateInspectionSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packingListId,
      flowType,
    }: {
      packingListId: string;
      flowType: FlowType;
    }) => {
      const response = await cargoInspectionApi.createSession(
        packingListId,
        flowType,
      );
      return response.data;
    },
    onSuccess: (session: CargoInspectionSession) => {
      queryClient.invalidateQueries({
        queryKey: cargoInspectionQueryKeys.sessions.root(),
      });
      toast.success('Inspection session created');
      return session;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create inspection session');
    },
  });
}
