import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  fetchMoveLoadedContainers,
  moveLoadedContainerApi,
  setMoveLoadedContainerCache,
} from '@/services/apiMoveLoadedContainer';
import { exportPlansApi } from '@/services/apiExportPlans';
import type {
  DeclareGetOutPayload,
  MoveLoadedContainerQueryParams,
  MoveLoadedContainerQueryResult,
  MoveStuffedContainerPayload,
  StuffedContainerMoveOutListItem,
  StuffingContainerListItem,
} from '../types';

export const moveLoadedContainerQueryKeys = {
  all: ['moveLoadedContainers'] as const,
  lists: () => [...moveLoadedContainerQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...moveLoadedContainerQueryKeys.lists(), filters] as const,
  details: () => [...moveLoadedContainerQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...moveLoadedContainerQueryKeys.details(), id] as const,
};

interface UseMoveLoadedContainersOptions {
  enabled?: boolean;
}

const normalizeWorkingResultStatus = (
  status?: string | null,
): StuffedContainerMoveOutListItem['workingResultStatus'] => {
  if (!status) return 'received';
  const normalized = status.toLowerCase();
  if (normalized === 'moved') return 'moved';
  return 'received';
};

const deriveContainerSize = (containerTypeCode?: string | null) => {
  if (!containerTypeCode) return null;
  const match = containerTypeCode.match(/\d+/);
  return match ? match[0] : null;
};

const buildMoveLoadedRecord = (
  item: StuffingContainerListItem,
): StuffedContainerMoveOutListItem => {
  const workingResultStatus = normalizeWorkingResultStatus(item.workingResultStatus);
  const timestampFallback =
    item.actualMoveTime ?? item.estimateMoveTime ?? new Date().toISOString();

  return {
    id: item.id,
    containerId: item.id,
    planStuffingId: item.planId,
    workingResultStatus,
    getOutContainerStatus: item.isContainerOut ?? false,
    estimateMoveTime: item.estimateMoveTime ?? null,
    etd: item.etd ?? null,
    actualMoveTime: item.actualMoveTime ?? null,
    truck: {
      plateNumber: null,
      driverName: null,
    },
    customsDeclaration: {
      declaredAt: null,
      declaredBy: null,
      referenceNo: null,
    },
    createdBy: null,
    updatedBy: null,
    createdAt: timestampFallback,
    updatedAt: timestampFallback,
    containerNumber: item.containerNumber,
    containerTypeCode: item.containerTypeCode,
    containerSize: deriveContainerSize(item.containerTypeCode),
    planStuffingNumber: item.planCode,
    forwarder: item.forwarderCode ?? null,
  };
};

const updateRecordCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  updated: StuffedContainerMoveOutListItem,
) => {
  queryClient.setQueryData(
    moveLoadedContainerQueryKeys.detail(updated.id),
    updated,
  );
  queryClient.setQueriesData<MoveLoadedContainerQueryResult>(
    { queryKey: moveLoadedContainerQueryKeys.lists() },
    (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        results: oldData.results.map((record) =>
          record.id === updated.id ? updated : record,
        ),
      };
    },
  );
};

export function useMoveLoadedContainers(
  params: MoveLoadedContainerQueryParams = {},
  options?: UseMoveLoadedContainersOptions,
) {
  return useQuery({
    queryKey: moveLoadedContainerQueryKeys.list(params),
    queryFn: async () => {
      const data = await fetchMoveLoadedContainers(params);
      const records = data.results.map((item) =>
        buildMoveLoadedRecord(item),
      );
      setMoveLoadedContainerCache(records);
      return {
        results: records,
        total: data.total ?? records.length,
      } satisfies MoveLoadedContainerQueryResult;
    },
    staleTime: 0,
    retry: 1,
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useMoveLoadedContainer(id: string) {
  return useQuery({
    queryKey: moveLoadedContainerQueryKeys.detail(id),
    queryFn: async () => moveLoadedContainerApi.getById(id),
    staleTime: 0,
    retry: 1,
    enabled: !!id,
  });
}

export function useMoveContainerToPort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: MoveStuffedContainerPayload;
    }) => moveLoadedContainerApi.moveContainerToPort(id, payload),
    onSuccess: (updated) => {
      updateRecordCaches(queryClient, updated);
    },
  });
}

export function useEditMovedContainerInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      record,
      payload,
    }: {
      record: StuffedContainerMoveOutListItem;
      payload: { plateNumber: string | null; driverName: string | null };
    }) => {
      if (!record.planStuffingId || !record.containerId) {
        throw new Error('Missing plan/container reference for move update');
      }
      await exportPlansApi.updateContainer(record.planStuffingId, record.containerId, {
        moveInfo: {
          truckNumber: payload.plateNumber ?? null,
          driverName: payload.driverName ?? null,
        },
      });

      return {
        ...record,
        truck: {
          plateNumber: payload.plateNumber ?? null,
          driverName: payload.driverName ?? null,
        },
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (updated) => {
      updateRecordCaches(queryClient, updated);
    },
  });
}

export function useDeclareGetOutToCustoms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: DeclareGetOutPayload;
    }) => moveLoadedContainerApi.declareGetOutToCustoms(id, payload),
    onSuccess: (updated) => {
      updateRecordCaches(queryClient, updated);
    },
  });
}
