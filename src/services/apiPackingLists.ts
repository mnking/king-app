import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  PackingListCreatePayload,
  PackingListDetail,
  PackingListListItem,
  PackingListQueryParams,
  PaginatedResponse,
  ApiResponse,
  SaveAsDraftPayload,
  SaveAsPartialPayload,
  PackingListUpdatePayload,
  PackingListLineResponseDto,
  PackingListLineCreatePayload,
  PackingListLineUpdatePayload,
  UpdateDocumentStatusPayload,
} from '@/features/packing-list/types';

const getPackingListUrl = (endpoint: string) =>
  buildEndpointURL('forwarder', endpoint);

const appendQueryParams = (params?: PackingListQueryParams) => {
  const searchParams = new URLSearchParams();
  if (!params) return searchParams.toString();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.itemsPerPage)
    searchParams.set('itemsPerPage', params.itemsPerPage.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.documentStatus) {
    const statuses = Array.isArray(params.documentStatus)
      ? params.documentStatus
      : [params.documentStatus];
    statuses.forEach((status) => searchParams.append('documentStatus', status));
  }
  if (params.forwarderId)
    searchParams.set('forwarderId', params.forwarderId);
  if (params.cargoType) searchParams.set('cargoType', params.cargoType);
  if (params.directionFlow)
    searchParams.set('directionFlow', params.directionFlow);
  if (params.orderBy) searchParams.set('orderBy', params.orderBy);
  if (params.orderDir) searchParams.set('orderDir', params.orderDir);
  if (params.containerNumber)
    searchParams.set('containerNumber', params.containerNumber);
  if (params.hblId) searchParams.set('hblId', params.hblId);
  if (params.eta) searchParams.set('eta', params.eta);
  if (typeof params.hasStoredPackages === 'boolean') {
    searchParams.set('hasStoredPackages', params.hasStoredPackages ? 'true' : 'false');
  }
  if (params.storedLocationId) {
    searchParams.set('storedLocationId', params.storedLocationId);
  }
  if (params.workingStatus) {
    const statuses = Array.isArray(params.workingStatus)
      ? params.workingStatus
      : [params.workingStatus];
    statuses.forEach((status) => searchParams.append('workingStatus', status));
  }

  return searchParams.toString();
};

const extractErrorMessage = async (response: Response, fallback: string) => {
  try {
    const text = await response.text();
    if (!text) return fallback;
    const data = JSON.parse(text);
    if (typeof data === 'string') return data;
    if (Array.isArray(data?.metaData)) {
      return data.metaData.filter((item: unknown) => typeof item === 'string').join('\n') || fallback;
    }
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return fallback;
  } catch {
    return fallback;
  }
};

const normalizePackingListResponse = async (
  response: Response,
): Promise<ApiResponse<PackingListDetail>> => {
  const data = (await response.json()) as unknown;
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return data as ApiResponse<PackingListDetail>;
  }

  return {
    statusCode: response.status,
    data: data as PackingListDetail,
  };
};

export const getPackingLists = async (
  params?: PackingListQueryParams,
): Promise<ApiResponse<PaginatedResponse<PackingListListItem>>> => {
  const query = appendQueryParams(params);
  const url = getPackingListUrl(
    query ? `/v1/packing-lists?${query}` : '/v1/packing-lists',
  );

  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to fetch packing lists',
      ),
    );
  }

  const data = (await response.json()) as unknown;

  // Backward/forward compatibility: some endpoints return { statusCode, data }, others return the payload directly.
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return data as ApiResponse<PaginatedResponse<PackingListListItem>>;
  }

  return {
    statusCode: response.status,
    data: data as PaginatedResponse<PackingListListItem>,
  };
};

export const getPackingList = async (
  id: string,
): Promise<ApiResponse<PackingListDetail>> => {
  const response = await apiFetch(getPackingListUrl(`/v1/packing-lists/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch packing list'),
    );
  }

  const data = (await response.json()) as unknown;

  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return data as ApiResponse<PackingListDetail>;
  }

  return {
    statusCode: response.status,
    data: data as PackingListDetail,
  };
};

export const createPackingList = async (
  payload: PackingListCreatePayload,
): Promise<ApiResponse<PackingListDetail>> => {
  const response = await apiFetch(getPackingListUrl('/v1/packing-lists'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to create packing list'),
    );
  }

  return normalizePackingListResponse(response);
};

export const updatePackingList = async (
  id: string,
  payload: PackingListUpdatePayload,
): Promise<ApiResponse<PackingListDetail>> => {
  const response = await apiFetch(getPackingListUrl(`/v1/packing-lists/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to update packing list'),
    );
  }

  return normalizePackingListResponse(response);
};

export const updateDocumentStatus = async (
  id: string,
  payload: UpdateDocumentStatusPayload,
): Promise<ApiResponse<PackingListDetail>> => {
  const response = await apiFetch(
    getPackingListUrl(`/v1/packing-lists/${id}/document-status`),
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to update packing list document status',
      ),
    );
  }

  return normalizePackingListResponse(response);
};

export const savePackingListAsDraft = async (
  id: string,
  payload: SaveAsDraftPayload,
): Promise<ApiResponse<PackingListDetail>> => {
  const response = await apiFetch(
    getPackingListUrl(`/v1/packing-lists/${id}`),
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to save draft'),
    );
  }

  return normalizePackingListResponse(response);
};

export const savePackingListAsPartial = async (
  id: string,
  payload: SaveAsPartialPayload,
): Promise<ApiResponse<PackingListDetail>> => {
  const response = await apiFetch(
    getPackingListUrl(`/v1/packing-lists/${id}/save-as-partial`),
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to save as partial'),
    );
  }

  return normalizePackingListResponse(response);
};

export const approvePackingList = async (id: string): Promise<void> => {
  const response = await apiFetch(
    getPackingListUrl(`/v1/packing-lists/${id}/approve`),
    {
      method: 'POST',
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to approve packing list'),
    );
  }
};

export const deletePackingList = async (id: string): Promise<void> => {
  const response = await apiFetch(getPackingListUrl(`/v1/packing-lists/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to delete packing list'),
    );
  }
};

// Packing List Lines API
export const getPackingListLines = async (
  packingListId: string,
  page: number = 1,
  itemsPerPage: number = 10,
): Promise<ApiResponse<PaginatedResponse<PackingListLineResponseDto>>> => {
  const query = new URLSearchParams({
    page: page.toString(),
    itemsPerPage: itemsPerPage.toString(),
  }).toString();

  const url = getPackingListUrl(
    `/v1/packing-lists/${packingListId}/lines?${query}`,
  );

  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to fetch packing list lines',
      ),
    );
  }

  const data = (await response.json()) as unknown;
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return data as ApiResponse<PaginatedResponse<PackingListLineResponseDto>>;
  }

  return {
    statusCode: response.status,
    data: data as PaginatedResponse<PackingListLineResponseDto>,
  };
};

export const createPackingListLine = async (
  packingListId: string,
  payload: PackingListLineCreatePayload,
): Promise<ApiResponse<PackingListLineResponseDto>> => {
  const response = await apiFetch(
    getPackingListUrl(`/v1/packing-lists/${packingListId}/lines`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to create packing list line'),
    );
  }

  const data = (await response.json()) as unknown;
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return data as ApiResponse<PackingListLineResponseDto>;
  }

  return {
    statusCode: response.status,
    data: data as PackingListLineResponseDto,
  };
};

export const updatePackingListLine = async (
  lineId: string,
  payload: PackingListLineUpdatePayload,
): Promise<ApiResponse<PackingListLineResponseDto>> => {
  const response = await apiFetch(
    getPackingListUrl(`/v1/packing-list-lines/${lineId}`),
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to update packing list line'),
    );
  }

  const data = (await response.json()) as unknown;
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return data as ApiResponse<PackingListLineResponseDto>;
  }

  return {
    statusCode: response.status,
    data: data as PackingListLineResponseDto,
  };
};

export const deletePackingListLine = async (lineId: string): Promise<void> => {
  const response = await apiFetch(
    getPackingListUrl(`/v1/packing-list-lines/${lineId}`),
    {
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to delete packing list line'),
    );
  }
};

export const packingListsApi = {
  getAll: getPackingLists,
  getById: getPackingList,
  create: createPackingList,
  update: updatePackingList,
  updateDocumentStatus,
  saveDraft: savePackingListAsDraft,
  savePartial: savePackingListAsPartial,
  approve: approvePackingList,
  delete: deletePackingList,
  lines: {
    getAll: getPackingListLines,
    create: createPackingListLine,
    update: updatePackingListLine,
    delete: deletePackingListLine,
  },
};
