import { env, buildEndpointURL, isRealAPI } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import { normalizeContainerNumber } from '@/shared/utils/container';
import type {
  Forwarder,
  ForwarderCreateForm,
  ForwarderUpdateForm,
  ApiResponse,
  PaginatedResponse,
  ForwardersQueryParams,
} from '@/features/forwarder/types';
import type {
  HouseBill,
  HBLCreateForm,
  HBLUpdateForm,
  HBLsQueryParams,
} from '@/features/hbl-management/types';

// Helper function to get API URL for Forwarder endpoints
const getForwarderUrl = (endpoint: string): string => {
  if (env.enableLogging) {
    console.log('🔍 getForwarderUrl debug:', {
      endpoint,
      useRealAPI: isRealAPI('forwarder'),
      baseUrl: '/api/forwarder',
    });
  }

  if (isRealAPI('forwarder')) {
    const fullUrl = buildEndpointURL('forwarder', endpoint);
    if (env.enableLogging) {
      console.log('📡 Real API URL constructed:', fullUrl);
    }
    return fullUrl;
  }

  // For MSW, prepend /api/forwarder to match MSW handler paths
  const mswUrl = `/api/forwarder${endpoint}`;
  if (env.enableLogging) {
    console.log('🎭 MSW URL returned:', mswUrl);
  }
  return mswUrl;
};

// Log which API is being used
if (env.enableLogging) {
  console.log(
    `📦 Forwarder API: ${isRealAPI('forwarder') ? 'Real API' : 'MSW Mock'} - /api/forwarder`,
  );
}

// ===========================
// Forwarder API Methods
// ===========================

export const getForwarders = async (
  params?: ForwardersQueryParams,
): Promise<ApiResponse<PaginatedResponse<Forwarder>>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.itemsPerPage)
    queryParams.append('itemsPerPage', params.itemsPerPage.toString());
  if (params?.name) queryParams.append('name', params.name);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.status && params.status !== 'all')
    queryParams.append('status', params.status);
  if (params?.contractStatus) queryParams.append('contractStatus', params.contractStatus);
  if (params?.order) queryParams.append('order', params.order);

  const response = await apiFetch(getForwarderUrl(`/v1/forwarders?${queryParams}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch forwarders: ${response.statusText}`);
  }

  return response.json();
};

export const getForwarder = async (id: string): Promise<ApiResponse<Forwarder>> => {
  const response = await apiFetch(getForwarderUrl(`/v1/forwarders/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch forwarder: ${response.statusText}`);
  }

  return response.json();
};

export const getForwarderByCode = async (code: string): Promise<ApiResponse<Forwarder>> => {
  const response = await apiFetch(getForwarderUrl(`/v1/forwarders/by-code/${code}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch forwarder by code: ${response.statusText}`);
  }

  return response.json();
};

export const getForwarderStats = async (): Promise<
  ApiResponse<{
    totalForwarders: number;
    totalActiveForwarders: number;
    totalActiveContracts: number;
  }>
> => {
  const response = await apiFetch(getForwarderUrl('/v1/forwarders/stats'), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch forwarder stats: ${response.statusText}`);
  }

  return response.json();
};

export const createForwarder = async (
  data: ForwarderCreateForm,
): Promise<ApiResponse<Forwarder>> => {
  const response = await apiFetch(getForwarderUrl('/v1/forwarders'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create forwarder: ${response.statusText}`);
  }

  return response.json();
};

export const updateForwarder = async (
  id: string,
  data: ForwarderUpdateForm,
): Promise<ApiResponse<Forwarder>> => {
  const response = await apiFetch(getForwarderUrl(`/v1/forwarders/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update forwarder: ${response.statusText}`);
  }

  return response.json();
};

export const deleteForwarder = async (id: string): Promise<void> => {
  const response = await apiFetch(getForwarderUrl(`/v1/forwarders/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to delete forwarder: ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If parsing fails, use the status text or response text
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
  }
};

// ===========================
// House Bill (HBL) API Methods
// ===========================

// Helper function to convert frontend status to backend status format
const toBackendStatus = (frontendStatus: string): string => {
  // Frontend uses "pending", "approved", "done" (lowercase)
  // Backend expects "Draft", "Approved", "Done" (capitalized)
  const statusMap: Record<string, string> = {
    pending: 'Draft',
    approved: 'Approved',
    done: 'Done',
  };
  return statusMap[frontendStatus.toLowerCase()] || frontendStatus;
};

// Helper function to normalize HBL status from backend to frontend format
const normalizeHBLStatus = (hbl: any): HouseBill => {
  // Backend returns "Draft", "Approved", "Done" (capitalized)
  // Frontend expects "pending" (for Draft), "approved", "done" (lowercase)
  let status: 'pending' | 'approved' | 'done' = 'pending';

  if (hbl.status) {
    const backendStatus = hbl.status.toLowerCase();
    if (backendStatus === 'draft') {
      status = 'pending';
    } else if (backendStatus === 'approved') {
      status = 'approved';
    } else if (backendStatus === 'done') {
      status = 'done';
    }
  } else if (hbl.isDone) {
    status = 'done';
  } else if (hbl.isApproved) {
    status = 'approved';
  }

  // Normalize packing list fields in case backend sends nested or flattened shape
  const rawPackingList = hbl.packingList ?? hbl.packingListLink ?? null;
  const packingList =
    rawPackingList
      ? {
          id: rawPackingList.id ?? hbl.packingListId ?? '',
          packingListNumber:
            rawPackingList.packingListNumber ?? hbl.packingListNumber ?? null,
          status:
            rawPackingList.status ??
            rawPackingList.packingListStatus ??
            hbl.packingListStatus ??
            null,
        }
      : hbl.packingListNumber || hbl.packingListStatus
        ? {
            id: hbl.packingListId ?? '',
            packingListNumber: hbl.packingListNumber ?? null,
            status: hbl.packingListStatus ?? null,
          }
        : null;

  return {
    ...hbl,
    status,
    packingList,
    packingListNumber: packingList?.packingListNumber ?? hbl.packingListNumber ?? null,
    packingListStatus: packingList?.status ?? hbl.packingListStatus ?? null,
  };
};

export const getHBLs = async (
  params?: HBLsQueryParams,
): Promise<ApiResponse<PaginatedResponse<HouseBill>>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.itemsPerPage)
    queryParams.append('itemsPerPage', params.itemsPerPage.toString());

  // Handle status filter (single value)
  const statusValue = params?.status?.trim();
  if (statusValue && statusValue !== 'all') {
    queryParams.append('status', toBackendStatus(statusValue));
  }

  const receivedAt = params?.receivedAt?.trim();
  if (receivedAt) {
    queryParams.append('receivedAt', receivedAt);
  }

  // Handle issuerId filter (single value)
  const issuerValue = params?.issuerId?.trim();
  if (issuerValue) {
    queryParams.append('issuerId', issuerValue);
  }

  const hblIds = params?.hblIds?.filter((id) => Boolean(id));
  if (hblIds && hblIds.length > 0) {
    Array.from(new Set(hblIds)).forEach((id) => {
      queryParams.append('hblIds[]', id);
    });
  }

  // Handle keywords
  if (params?.keywords?.trim()) {
    queryParams.append('keywords', params.keywords.trim());
  }

  if (params?.sortField) {
    queryParams.append('sortField', params.sortField);
  }

  if (params?.sortOrder) {
    queryParams.append('sortOrder', params.sortOrder);
  }

  const containerNumber = params?.containerNumber
    ? normalizeContainerNumber(params.containerNumber)
    : '';
  if (containerNumber) {
    queryParams.append('containerNumber', containerNumber);
  }

  const sealNumber = params?.sealNumber?.trim();
  if (sealNumber) {
    queryParams.append('sealNumber', sealNumber);
  }

  if (params?.hasPackingList !== undefined) {
    queryParams.append('hasPackingList', String(params.hasPackingList));
  }

  const customsStatus = params?.customsStatus;
  if (typeof customsStatus === 'string' && customsStatus.trim() && customsStatus !== 'ALL') {
    queryParams.append('customsStatus', customsStatus.trim());
  }

  const workingStatus = params?.workingStatus;
  if (Array.isArray(workingStatus)) {
    workingStatus.forEach((status) => {
      if (status) {
        queryParams.append('workingStatus', status);
      }
    });
  } else if (typeof workingStatus === 'string' && workingStatus.trim()) {
    queryParams.append('workingStatus', workingStatus.trim());
  }

  const response = await apiFetch(getForwarderUrl(`/v1/hbls?${queryParams}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HBLs: ${response.statusText}`);
  }

  const data = await response.json();

  const payload = data?.data ?? data;

  // Normalize status for all HBLs (supports both nested and top-level payloads)
  if (payload?.results) {
    payload.results = payload.results.map(normalizeHBLStatus);
    if (typeof payload.total !== 'number') {
      payload.total = payload.results.length;
    }
  }

  return {
    ...data,
    data: payload,
  };
};

export const getHBL = async (id: string): Promise<ApiResponse<HouseBill>> => {
  const response = await apiFetch(getForwarderUrl(`/v1/hbls/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HBL: ${response.statusText}`);
  }

  const data = await response.json();

  const payload = data?.data ?? data;

  // Normalize status (supports both nested and top-level payloads)
  const normalized = normalizeHBLStatus(payload);

  return {
    ...data,
    data: normalized,
  };
};

export const createHBL = async (data: HBLCreateForm): Promise<ApiResponse<HouseBill>> => {
  console.log('📤 Sending HBL data:', JSON.stringify(data, null, 2));

  const response = await apiFetch(getForwarderUrl('/v1/hbls'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText
    }));
    console.error('❌ HBL Creation Error:', JSON.stringify(errorBody, null, 2));

    // Handle specific error cases
    if (response.status === 404) {
      // Container not found
      const containerNum = data.containers?.[0]?.containerNumber;
      throw new Error(
        `Container "${containerNum}" does not exist in the system. ` +
        `Please create the container first or verify the container number.`
      );
    }

    if (response.status === 409) {
      // Conflict error - use backend message (e.g., seal number conflict, duplicate code, etc.)
      throw new Error(
        errorBody.message ||
        'Conflict detected. This operation cannot be completed due to a uniqueness constraint.'
      );
    }

    // Validation errors
    if (errorBody.metaData && Array.isArray(errorBody.metaData)) {
      const validationErrors = errorBody.metaData.join(', ');
      throw new Error(`Validation failed: ${validationErrors}`);
    }

    // Generic error
    throw new Error(errorBody.message || `Failed to create HBL: ${response.statusText}`);
  }

  const responseData = await response.json();

  // Normalize status
  if (responseData.data) {
    responseData.data = normalizeHBLStatus(responseData.data);
  }

  return responseData;
};

export const updateHBL = async (
  id: string,
  data: HBLUpdateForm,
): Promise<ApiResponse<HouseBill>> => {
  // Remove undefined values to avoid sending them to the backend
  const cleanedData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  console.log('📤 Updating HBL with data:', JSON.stringify(cleanedData, null, 2));

  const response = await apiFetch(getForwarderUrl(`/v1/hbls/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cleanedData),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText
    }));
    console.error('❌ HBL Update Error:', JSON.stringify(errorBody, null, 2));

    // Handle specific error cases
    if (response.status === 404) {
      const containerNum = data.containers?.[0]?.containerNumber;
      if (containerNum) {
        throw new Error(
          `Container "${containerNum}" does not exist in the system. ` +
          `Please create the container first or verify the container number.`
        );
      }
      throw new Error('HBL not found. It may have been deleted.');
    }

    if (response.status === 409) {
      // Conflict error - use backend message (e.g., seal number conflict, duplicate code, etc.)
      throw new Error(
        errorBody.message ||
        'Conflict detected. This operation cannot be completed due to a uniqueness constraint.'
      );
    }

    // Validation errors
    if (errorBody.metaData && Array.isArray(errorBody.metaData)) {
      const validationErrors = errorBody.metaData.join(', ');
      throw new Error(`Validation failed: ${validationErrors}`);
    }

    // Generic error
    throw new Error(errorBody.message || `Failed to update HBL: ${response.statusText}`);
  }

  const responseData = await response.json();

  // Normalize status
  if (responseData.data) {
    responseData.data = normalizeHBLStatus(responseData.data);
  }

  return responseData;
};

export const approveHBL = async (id: string): Promise<ApiResponse<HouseBill>> => {
  const response = await apiFetch(getForwarderUrl(`/v1/hbls/${id}/approve`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText
    }));

    // Handle specific error cases
    if (response.status === 400) {
      throw new Error(
        errorBody.message ||
        'Cannot approve HBL. Please ensure all required fields are filled.'
      );
    }

    if (response.status === 409) {
      // Conflict error - use backend message
      throw new Error(
        errorBody.message ||
        'Cannot approve HBL. A conflict was detected (possibly seal number or code uniqueness).'
      );
    }

    throw new Error(errorBody.message || `Failed to approve HBL: ${response.statusText}`);
  }

  // Backend returns 204 No Content on success - need to fetch updated HBL
  if (response.status === 204) {
    // Success but no body - fetch the updated HBL to return
    const hblResponse = await apiFetch(getForwarderUrl(`/v1/hbls/${id}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!hblResponse.ok) {
      throw new Error(`Approved successfully but failed to fetch updated HBL: ${hblResponse.statusText}`);
    }

    const data = await hblResponse.json();

    // Normalize status
    if (data.data) {
      data.data = normalizeHBLStatus(data.data);
    }

    return data;
  }

  // Fallback: if backend returns 200 with JSON body (future-proofing)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const responseData = await response.json();

    // Normalize status
    if (responseData.data) {
      responseData.data = normalizeHBLStatus(responseData.data);
    }

    return responseData;
  }

  // If we get here, approval succeeded but response format is unexpected
  // Fetch the updated HBL to be safe
  const hblResponse = await apiFetch(getForwarderUrl(`/v1/hbls/${id}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!hblResponse.ok) {
    throw new Error(`Approved successfully but failed to fetch updated HBL: ${hblResponse.statusText}`);
  }

  const data = await hblResponse.json();

  // Normalize status
  if (data.data) {
    data.data = normalizeHBLStatus(data.data);
  }

  return data;
};

export const markHBLDone = async (
  id: string,
  marked: boolean,
): Promise<ApiResponse<HouseBill>> => {
  const response = await apiFetch(getForwarderUrl(`/v1/hbls/${id}/done`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ marked }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark HBL as done: ${response.statusText}`);
  }

  // Backend may return 204 No Content on success - need to fetch updated HBL
  if (response.status === 204) {
    // Success but no body - fetch the updated HBL to return
    const hblResponse = await apiFetch(getForwarderUrl(`/v1/hbls/${id}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!hblResponse.ok) {
      throw new Error(`Marked as done successfully but failed to fetch updated HBL: ${hblResponse.statusText}`);
    }

    const data = await hblResponse.json();

    // Normalize status
    if (data.data) {
      data.data = normalizeHBLStatus(data.data);
    }

    return data;
  }

  // Fallback: if backend returns 200 with JSON body (future-proofing)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const responseData = await response.json();

    // Normalize status
    if (responseData.data) {
      responseData.data = normalizeHBLStatus(responseData.data);
    }

    return responseData;
  }

  // If we get here, operation succeeded but response format is unexpected
  // Fetch the updated HBL to be safe
  const hblResponse = await apiFetch(getForwarderUrl(`/v1/hbls/${id}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!hblResponse.ok) {
    throw new Error(`Marked as done successfully but failed to fetch updated HBL: ${hblResponse.statusText}`);
  }

  const data = await hblResponse.json();

  // Normalize status
  if (data.data) {
    data.data = normalizeHBLStatus(data.data);
  }

  return data;
};

export const deleteHBL = async (id: string): Promise<void> => {
  const response = await apiFetch(getForwarderUrl(`/v1/hbls/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to delete HBL: ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If parsing fails, use the status text or response text
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
  }
};

// ===========================
// HBL Import API Methods
// ===========================

export interface ImportHblMappingDto {
  header: Record<string, string>;
  columns: Record<string, string>;
}

export type ImportStatus = 'INIT' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ImportHistoryErrorDetail {
  row: number;
  error: string;
  field?: string;
}

export interface ImportHistoryResponseDto {
  id: string;
  issuerId: string;
  processImportId?: string | null;
  status: ImportStatus;
  totalRows: number;
  successCount: number;
  failedCount: number;
  errorDetails?: ImportHistoryErrorDetail[] | null;
  sourceFileName?: string | null;
  sourceFileSize?: number | null;
  createdAt: string;
}

export const getDefaultHblImportMapping = async (): Promise<ApiResponse<ImportHblMappingDto>> => {
  const response = await apiFetch(getForwarderUrl('/v1/hbls/default-mapping-import'), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HBL import mapping: ${response.statusText}`);
  }

  return response.json();
};

export const importHbls = async (params: {
  file: File;
  validateOnly?: boolean;
  processImportId?: string;
  mappedKeys?: Partial<ImportHblMappingDto>;
}): Promise<ApiResponse<ImportHistoryResponseDto>> => {
  const formData = new FormData();
  formData.append('file', params.file);

  if (typeof params.validateOnly === 'boolean') {
    formData.append('validateOnly', String(params.validateOnly));
  }

  if (params.processImportId) {
    formData.append('processImportId', params.processImportId);
  }

  if (params.mappedKeys) {
    formData.append('mappedKeys', JSON.stringify(params.mappedKeys));
  }

  const response = await apiFetch(getForwarderUrl('/v1/hbls/import'), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to import HBLs: ${response.statusText}`;
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.message) errorMessage = errorData.message;
      else if (errorData.error) errorMessage = errorData.error;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const getLatestHblImportHistory = async (
  issuerId: string,
): Promise<ApiResponse<ImportHistoryResponseDto>> => {
  const response = await apiFetch(
    getForwarderUrl(`/v1/hbls/import-history/latest?issuerId=${encodeURIComponent(issuerId)}`),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch latest HBL import history: ${response.statusText}`);
  }

  return response.json();
};

// ===========================
// Organized API Exports
// ===========================

export const forwardersApi = {
  getAll: getForwarders,
  getById: getForwarder,
  getByCode: getForwarderByCode,
  getStats: getForwarderStats,
  create: createForwarder,
  update: updateForwarder,
  delete: deleteForwarder,
};

export const hblsApi = {
  getAll: getHBLs,
  getById: getHBL,
  create: createHBL,
  update: updateHBL,
  approve: approveHBL,
  markDone: markHBLDone,
  delete: deleteHBL,
  getDefaultImportMapping: getDefaultHblImportMapping,
  import: importHbls,
  getImportHistoryLatest: getLatestHblImportHistory,
};
