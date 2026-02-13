import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { cargoInspectionApi } from '@/services/apiCargoInspection';
import { cargoInspectionQueryKeys } from './use-cargo-inspection-sessions';
import type { LineInspection, PackageCheckData } from '../types';

const normalizeLineInspections = (
  data: LineInspection[] | { results?: LineInspection[] } | undefined,
) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { results?: LineInspection[] }).results)) {
    return (data as { results: LineInspection[] }).results;
  }
  return [];
};

export function useSessionLineInspections(sessionId: string) {
  return useQuery({
    queryKey: cargoInspectionQueryKeys.lines.bySession(sessionId),
    queryFn: async () => {
      const response = await cargoInspectionApi.getSessionLines(sessionId);
      return normalizeLineInspections(response.data);
    },
    enabled: Boolean(sessionId),
    retry: 1,
  });
}

export function useLineInspectionDetail(lineInspectionId: string) {
  return useQuery({
    queryKey: cargoInspectionQueryKeys.lines.detail(lineInspectionId),
    queryFn: async () => {
      const response = await cargoInspectionApi.getLineDetail(lineInspectionId);
      return response.data;
    },
    enabled: Boolean(lineInspectionId),
    retry: 1,
  });
}

type LineCompletionPayload = Pick<
  LineInspection,
  | 'actualPackageCount'
  | 'actualCargoQuantity'
  | 'regulatoryCargoType'
  | 'regulatoryCargoDescription'
>;

export function useRecordPackageInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lineInspectionId,
      sessionId,
      data,
    }: {
      lineInspectionId: string;
      sessionId?: string;
      data: PackageCheckData;
    }) => {
      const response = await cargoInspectionApi.recordPackageInspection(
        lineInspectionId,
        data,
      );
      return { response, sessionId, lineInspectionId };
    },
    onSuccess: ({ response, sessionId, lineInspectionId }) => {
      queryClient.invalidateQueries({
        queryKey: cargoInspectionQueryKeys.lines.detail(lineInspectionId),
      });
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: cargoInspectionQueryKeys.lines.bySession(sessionId),
        });
      }
      toast.success('Package inspection recorded');
      return response.data;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record package inspection');
    },
  });
}

export function useCompleteLineInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lineInspectionId,
      sessionId,
      payload,
    }: {
      lineInspectionId: string;
      sessionId?: string;
      payload: LineCompletionPayload;
    }) => {
      const response = await cargoInspectionApi.completeLineInspection(
        lineInspectionId,
        payload,
      );
      return { response, sessionId, lineInspectionId };
    },
    onSuccess: ({ response, sessionId, lineInspectionId }) => {
      queryClient.invalidateQueries({
        queryKey: cargoInspectionQueryKeys.lines.detail(lineInspectionId),
      });
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: cargoInspectionQueryKeys.lines.bySession(sessionId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: cargoInspectionQueryKeys.sessions.root(),
      });
      toast.success('Line inspection completed');
      return response.data;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete line inspection');
    },
  });
}

type LineUpdatePayload = Pick<
  LineInspection,
  | 'actualPackageCount'
  | 'actualCargoQuantity'
  | 'regulatoryCargoType'
  | 'regulatoryCargoDescription'
>;

export function useUpdateLineInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lineInspectionId,
      sessionId,
      payload,
    }: {
      lineInspectionId: string;
      sessionId?: string;
      payload: LineUpdatePayload;
    }) => {
      const response = await cargoInspectionApi.updateLineInspection(
        lineInspectionId,
        payload,
      );
      return { response, sessionId, lineInspectionId };
    },
    onSuccess: ({ response, sessionId, lineInspectionId }) => {
      queryClient.invalidateQueries({
        queryKey: cargoInspectionQueryKeys.lines.detail(lineInspectionId),
      });
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: cargoInspectionQueryKeys.lines.bySession(sessionId),
        });
      }
      toast.success('Line inspection updated');
      return response.data;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update line inspection');
    },
  });
}
