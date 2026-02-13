import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  EmptyContainerReceivingListItem,
  EmptyContainerReceivingRecord,
  InspectionFile,
  ReceiveEmptyContainerQueryParams,
  StuffingContainerQueryResult,
} from '@/features/receive-empty-container/types';

const getStuffingContainersUrl = (endpoint: string) =>
  buildEndpointURL('cfs', endpoint);

let cachedRecords: EmptyContainerReceivingListItem[] = [];

const findRecord = (id: string) => {
  const record = cachedRecords.find((item) => item.id === id);
  if (!record) {
    throw new Error('Empty container record not found');
  }
  return record;
};

const touch = (record: EmptyContainerReceivingRecord) => {
  record.updatedAt = new Date().toISOString();
};

const extractErrorMessage = async (response: Response, fallback: string) => {
  try {
    const text = await response.text();
    if (!text) return fallback;
    const data = JSON.parse(text);
    if (typeof data === 'string') return data;
    if (Array.isArray(data?.errors)) return data.errors.join(', ');
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return fallback;
  } catch {
    return fallback;
  }
};

const unwrapResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

const appendQueryParams = (params?: ReceiveEmptyContainerQueryParams) => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.itemsPerPage) searchParams.set('itemsPerPage', params.itemsPerPage.toString());
  if (params?.search) searchParams.set('search', params.search);
  if (params?.containerNumber?.length) {
    params.containerNumber.forEach((value) => {
      if (value) searchParams.append('containerNumber', value);
    });
  }
  if (params?.planCode?.length) {
    params.planCode.forEach((value) => {
      if (value) searchParams.append('planCode', value);
    });
  }
  if (params?.estimatedStuffingFrom) {
    searchParams.set('estimatedStuffingFrom', params.estimatedStuffingFrom);
  }
  if (params?.estimatedStuffingTo) {
    searchParams.set('estimatedStuffingTo', params.estimatedStuffingTo);
  }
  if (params?.workingResultStatus) {
    searchParams.set('workingResultStatus', params.workingResultStatus.toUpperCase());
  }
  if (params?.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }

  searchParams.append('status', 'SPECIFIED');
  searchParams.append('status', 'CONFIRMED');

  return searchParams.toString();
};

export const fetchReceiveEmptyContainers = async (
  params: ReceiveEmptyContainerQueryParams = {},
): Promise<StuffingContainerQueryResult> => {
  const query = appendQueryParams(params);
  const url = getStuffingContainersUrl(
    query ? `/v1/export-plans/stuffing-containers?${query}` : '/v1/export-plans/stuffing-containers',
  );
  const response = await apiFetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch confirmed stuffing containers'),
    );
  }

  const payload = await response.json();
  const data = unwrapResponse<StuffingContainerQueryResult>(payload);
  return data;
};

export const setReceiveEmptyContainerCache = (
  records: EmptyContainerReceivingListItem[],
) => {
  cachedRecords = records;
};

export const receiveEmptyContainerApi = {
  getById: async (id: string) => {
    return { ...findRecord(id) };
  },
  receiveContainer: async (
    record: EmptyContainerReceivingListItem,
    payload: {
      note?: string | null;
      documents?: InspectionFile[];
      images?: InspectionFile[];
      plateNumber?: string | null;
      driverName?: string | null;
    },
  ) => {
    return receiveEmptyContainerApi.submitCheckingResult(record, 'RECEIVE', payload);
  },
  rejectContainer: async (
    record: EmptyContainerReceivingListItem,
    payload: {
      note?: string | null;
      documents?: InspectionFile[];
      images?: InspectionFile[];
      plateNumber?: string | null;
      driverName?: string | null;
    },
  ) => {
    return receiveEmptyContainerApi.submitCheckingResult(record, 'REJECT', payload);
  },
  submitCheckingResult: async (
    record: EmptyContainerReceivingListItem,
    action: 'RECEIVE' | 'REJECT',
    payload: {
      note?: string | null;
      documents?: InspectionFile[];
      images?: InspectionFile[];
      plateNumber?: string | null;
      driverName?: string | null;
    },
  ) => {
    if (!record.planStuffingId || !record.containerId) {
      throw new Error('Missing plan/container reference for checking result');
    }
    const url = getStuffingContainersUrl(
      `/v1/export-plans/${record.planStuffingId}/containers/${record.containerId}/checking-result`,
    );
    const body = {
      action,
      checkingResult: {
        truckNumber: payload.plateNumber ?? null,
        driverName: payload.driverName ?? null,
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
    };

    const response = await apiFetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, 'Failed to submit checking result'),
      );
    }

    const cached = findRecord(record.id);
    cached.inspection = {
      note: payload.note ?? null,
      documents: payload.documents ?? [],
      images: payload.images ?? [],
    };
    cached.truck = {
      plateNumber: payload.plateNumber ?? null,
      driverName: payload.driverName ?? null,
    };
    cached.workingResultStatus = action === 'RECEIVE' ? 'received' : 'rejected';
    cached.receiveTime = action === 'RECEIVE' ? new Date().toISOString() : null;
    touch(cached);
    return { ...cached };
  },
  updateMoveInfo: async (
    record: EmptyContainerReceivingListItem,
    payload: { plateNumber?: string | null; driverName?: string | null },
  ) => {
    if (!record.planStuffingId || !record.containerId) {
      throw new Error('Missing plan/container reference for move update');
    }
    const url = getStuffingContainersUrl(
      `/v1/export-plans/${record.planStuffingId}/containers/${record.containerId}/move`,
    );
    const body = {
      moveInfo: {
        truckNumber: payload.plateNumber ?? null,
        driverName: payload.driverName ?? null,
      },
    };

    const response = await apiFetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, 'Failed to update move info'),
      );
    }

    const cached = findRecord(record.id);
    cached.truck = {
      plateNumber: payload.plateNumber ?? null,
      driverName: payload.driverName ?? null,
    };
    touch(cached);
    return { ...cached };
  },
};
