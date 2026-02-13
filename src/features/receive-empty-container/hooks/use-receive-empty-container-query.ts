import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  fetchReceiveEmptyContainers,
  receiveEmptyContainerApi,
  setReceiveEmptyContainerCache,
} from '@/services/apiReceiveEmptyContainer';
import { exportPlansApi } from '@/services/apiExportPlans';
import type {
  EmptyContainerReceivingListItem,
  EmptyContainerReceivingRecord,
  InspectionFile,
  ReceiveEmptyContainerQueryParams,
  ReceiveEmptyContainerQueryResult,
  StuffingContainerListItem,
} from '../types';

export const receiveEmptyContainerQueryKeys = {
  all: ['receiveEmptyContainers'] as const,
  lists: () => [...receiveEmptyContainerQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...receiveEmptyContainerQueryKeys.lists(), filters] as const,
  details: () => [...receiveEmptyContainerQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...receiveEmptyContainerQueryKeys.details(), id] as const,
};

interface UseReceiveEmptyContainersOptions {
  enabled?: boolean;
}

const normalizeWorkingResultStatus = (
  status?: string | null,
): EmptyContainerReceivingRecord['workingResultStatus'] => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (normalized === 'received') return 'received';
  if (normalized === 'rejected') return 'rejected';
  return 'waiting';
};

const deriveContainerSize = (containerTypeCode?: string | null) => {
  if (!containerTypeCode) return null;
  const match = containerTypeCode.match(/\d+/);
  return match ? match[0] : null;
};

const buildReceivingRecord = (
  item: StuffingContainerListItem,
): EmptyContainerReceivingListItem => {
  const workingResultStatus = normalizeWorkingResultStatus(item.workingResultStatus);
  const receiveTime =
    workingResultStatus === 'received'
      ? item.receivedAt ?? item.actualMoveTime ?? null
      : null;
  const timestampFallback =
    item.actualMoveTime ?? item.estimateMoveTime ?? new Date().toISOString();

  return {
    id: item.id,
    containerId: item.id,
    planStuffingId: item.planId,
    workingResultStatus,
    getInEmptyContainerStatus: item.isContainerIn ?? false,
    receiveTime,
    inspection: {
      note: null,
      documents: [],
      images: [],
    },
    truck: {
      plateNumber: null,
      driverName: null,
    },
    customsDeclaration: {
      declaredAt: null,
      declaredBy: null,
      referenceNo: null,
    },
    createdAt: timestampFallback,
    updatedAt: timestampFallback,
    containerPositionStatus: null,
    containerNumber: item.containerNumber,
    containerTypeCode: item.containerTypeCode,
    containerSize: deriveContainerSize(item.containerTypeCode),
    planStuffingNumber: item.planCode,
    estimatedStuffingTime: item.estimateMoveTime ?? null,
  };
};

const updateRecordCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  updated: EmptyContainerReceivingListItem,
) => {
  queryClient.setQueryData(
    receiveEmptyContainerQueryKeys.detail(updated.id),
    updated,
  );
  queryClient.setQueriesData<ReceiveEmptyContainerQueryResult>(
    { queryKey: receiveEmptyContainerQueryKeys.lists() },
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

export function useReceiveEmptyContainers(
  params: ReceiveEmptyContainerQueryParams = {},
  options?: UseReceiveEmptyContainersOptions,
) {
  return useQuery({
    queryKey: receiveEmptyContainerQueryKeys.list(params),
    queryFn: async () => {
      const data = await fetchReceiveEmptyContainers(params);
      const records = data.results.map((item) =>
        buildReceivingRecord(item),
      );
      setReceiveEmptyContainerCache(records);
      return {
        results: records,
        total: data.total ?? records.length,
      } satisfies ReceiveEmptyContainerQueryResult;
    },
    staleTime: 0,
    retry: 1,
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useReceiveEmptyContainer(id: string) {
  return useQuery({
    queryKey: receiveEmptyContainerQueryKeys.detail(id),
    queryFn: async () => receiveEmptyContainerApi.getById(id),
    staleTime: 0,
    retry: 1,
    enabled: !!id,
  });
}

export function useReceiveContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      record,
      payload,
    }: {
      record: EmptyContainerReceivingListItem;
      payload: {
        note?: string | null;
        documents?: InspectionFile[];
        images?: InspectionFile[];
        plateNumber?: string | null;
        driverName?: string | null;
      };
    }) => receiveEmptyContainerApi.receiveContainer(record, payload),
    onSuccess: (updated) => {
      updateRecordCaches(queryClient, updated);
    },
  });
}

export function useRejectContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      record,
      payload,
    }: {
      record: EmptyContainerReceivingListItem;
      payload: {
        note?: string | null;
        documents?: InspectionFile[];
        images?: InspectionFile[];
        plateNumber?: string | null;
        driverName?: string | null;
      };
    }) => receiveEmptyContainerApi.rejectContainer(record, payload),
    onSuccess: (updated) => {
      updateRecordCaches(queryClient, updated);
    },
  });
}

export function useUpdateCheckingInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      record,
      payload,
    }: {
      record: EmptyContainerReceivingListItem;
      payload: {
        note?: string | null;
        documents?: InspectionFile[];
        images?: InspectionFile[];
        plateNumber?: string | null;
        driverName?: string | null;
      };
    }) => {
      if (!record.planStuffingId || !record.containerId) {
        throw new Error('Missing plan/container reference for checking update');
      }
      await exportPlansApi.updateContainer(record.planStuffingId, record.containerId, {
        checkingResult: {
          truckNumber: payload.plateNumber ?? '',
          driverName: payload.driverName ?? '',
          note: payload.note ?? null,
          document: payload.documents?.[0]
            ? {
                id: payload.documents[0].id,
                url: payload.documents[0].url,
                name: payload.documents[0].name,
              }
            : null,
          image: payload.images?.[0]
            ? {
                id: payload.images[0].id,
                url: payload.images[0].url,
                name: payload.images[0].name,
              }
            : null,
        },
      });

      return {
        ...record,
        inspection: {
          note: payload.note ?? null,
          documents: payload.documents ?? [],
          images: payload.images ?? [],
        },
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

export function useUpdateMoveInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      record,
      payload,
    }: {
      record: EmptyContainerReceivingListItem;
      payload: {
        plateNumber?: string | null;
        driverName?: string | null;
      };
    }) => receiveEmptyContainerApi.updateMoveInfo(record, payload),
    onSuccess: (updated) => {
      updateRecordCaches(queryClient, updated);
    },
  });
}

export function useDeclareGetInEmptyContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: EmptyContainerReceivingListItem) => {
      if (!record.planStuffingId || !record.containerId) {
        throw new Error('Missing plan/container reference for customs declaration');
      }
      await exportPlansApi.declareContainerCustoms(record.planStuffingId, record.containerId, {
        declarationType: 'GET_IN_EMPTY',
      });

      return {
        ...record,
        getInEmptyContainerStatus: true,
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (updated) => {
      updateRecordCaches(queryClient, updated);
    },
  });
}
