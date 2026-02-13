import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  DeclareGetOutPayload,
  MoveLoadedContainerQueryParams,
  MoveStuffedContainerPayload,
  StuffedContainerMoveOutListItem,
  StuffingContainerQueryResult,
} from '@/features/move-loaded-container/types';

const getStuffingContainersUrl = (endpoint: string) =>
  buildEndpointURL('cfs', endpoint);

let cachedRecords: StuffedContainerMoveOutListItem[] = [];

const findRecord = (id: string) => {
  const record = cachedRecords.find((item) => item.id === id);
  if (!record) {
    throw new Error('Loaded container record not found');
  }
  return record;
};

const touch = (record: StuffedContainerMoveOutListItem) => {
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

const appendQueryParams = (params?: MoveLoadedContainerQueryParams) => {
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
  if (params?.estimateMoveFrom) {
    searchParams.set('estimateMoveFrom', params.estimateMoveFrom);
  }
  if (params?.estimateMoveTo) {
    searchParams.set('estimateMoveTo', params.estimateMoveTo);
  }
  if (params?.workingResultStatus) {
    searchParams.set('workingResultStatus', params.workingResultStatus.toUpperCase());
  }
  if (params?.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }

  searchParams.append('status', 'STUFFED');

  return searchParams.toString();
};

export const fetchMoveLoadedContainers = async (
  params: MoveLoadedContainerQueryParams = {},
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
      await extractErrorMessage(response, 'Failed to fetch stuffed containers'),
    );
  }

  const payload = await response.json();
  const data = unwrapResponse<StuffingContainerQueryResult>(payload);
  return data;
};

export const setMoveLoadedContainerCache = (
  records: StuffedContainerMoveOutListItem[],
) => {
  cachedRecords = records;
};

export const moveLoadedContainerApi = {
  getById: async (id: string) => {
    return { ...findRecord(id) };
  },
  moveContainerToPort: async (id: string, payload: MoveStuffedContainerPayload) => {
    const record = findRecord(id);
    if (!record.planStuffingId || !record.containerId) {
      throw new Error('Missing plan/container reference for move');
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
        await extractErrorMessage(response, 'Failed to move container to port'),
      );
    }

    record.workingResultStatus = 'moved';
    record.actualMoveTime = new Date().toISOString();
    record.truck = {
      plateNumber: payload.plateNumber,
      driverName: payload.driverName,
    };
    touch(record);
    return { ...record };
  },
  editMovedContainerInfo: async (
    id: string,
    payload: { plateNumber: string | null; driverName: string | null },
  ) => {
    const record = findRecord(id);
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

    record.truck = {
      plateNumber: payload.plateNumber,
      driverName: payload.driverName,
    };
    touch(record);
    return { ...record };
  },
  declareGetOutToCustoms: async (id: string, payload: DeclareGetOutPayload) => {
    const record = findRecord(id);
    if (!record.planStuffingId || !record.containerId) {
      throw new Error('Missing plan/container reference for customs declaration');
    }
    const url = getStuffingContainersUrl(
      `/v1/export-plans/${record.planStuffingId}/containers/${record.containerId}/customs-declaration`,
    );
    const body = { declarationType: 'GET_OUT_STUFFED' };

    const response = await apiFetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, 'Failed to declare get-out'),
      );
    }

    record.getOutContainerStatus = true;
    record.customsDeclaration = {
      declaredAt: record.customsDeclaration.declaredAt ?? new Date().toISOString(),
      declaredBy: record.customsDeclaration.declaredBy ?? null,
      referenceNo: payload.referenceNo ?? record.customsDeclaration.referenceNo ?? null,
    };
    touch(record);
    return { ...record };
  },
};
