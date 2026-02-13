import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ApiResponse,
  ExportServiceOrder,
  ExportServiceOrderPackingListAssignPayload,
  ExportServiceOrderPackingListTransferPayload,
  ExportServiceOrderPayload,
  ExportServiceOrderQueryParams,
  PaginatedResponse,
} from '@/features/export-service-order/types';

const getExportOrdersUrl = (endpoint: string) =>
  buildEndpointURL('cfs', endpoint);

const appendQueryParams = (params?: ExportServiceOrderQueryParams) => {
  const searchParams = new URLSearchParams();
  if (!params) return searchParams.toString();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.itemsPerPage)
    searchParams.set('itemsPerPage', params.itemsPerPage.toString());
  if (params.status) searchParams.set('status', params.status);
  if (params.orderNumber) searchParams.set('orderNumber', params.orderNumber);
  if (params.forwarderId) searchParams.set('forwarderId', params.forwarderId);
  if (params.requestDate) searchParams.set('requestDate', params.requestDate);
  if (params.orderBy) searchParams.set('orderBy', params.orderBy);
  if (params.orderDir) searchParams.set('orderDir', params.orderDir);

  return searchParams.toString();
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

const parseApiResponse = async <T>(
  response: Response,
): Promise<ApiResponse<T>> => {
  const data = (await response.json()) as unknown;

  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return data as ApiResponse<T>;
  }

  return {
    statusCode: response.status,
    data: data as T,
  };
};

export const getExportOrders = async (
  params?: ExportServiceOrderQueryParams,
): Promise<ApiResponse<PaginatedResponse<ExportServiceOrder>>> => {
  const query = appendQueryParams(params);
  const url = getExportOrdersUrl(
    query ? `/v1/export-orders?${query}` : '/v1/export-orders',
  );

  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch export orders'),
    );
  }

  return parseApiResponse<PaginatedResponse<ExportServiceOrder>>(response);
};

const getExportOrderById = async (
  id: string,
): Promise<ApiResponse<ExportServiceOrder>> => {
  const response = await apiFetch(getExportOrdersUrl(`/v1/export-orders/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch export order'),
    );
  }

  return parseApiResponse<ExportServiceOrder>(response);
};

const createExportOrder = async (
  payload: ExportServiceOrderPayload,
): Promise<ApiResponse<ExportServiceOrder>> => {
  const response = await apiFetch(getExportOrdersUrl('/v1/export-orders'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to create export order'),
    );
  }

  return parseApiResponse<ExportServiceOrder>(response);
};

const updateExportOrder = async (
  id: string,
  payload: ExportServiceOrderPayload,
): Promise<ApiResponse<ExportServiceOrder>> => {
  const response = await apiFetch(getExportOrdersUrl(`/v1/export-orders/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to update export order'),
    );
  }

  return parseApiResponse<ExportServiceOrder>(response);
};

const approveExportOrder = async (
  id: string,
): Promise<ApiResponse<ExportServiceOrder>> => {
  const response = await apiFetch(
    getExportOrdersUrl(`/v1/export-orders/${id}/approve`),
    {
      method: 'POST',
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to approve export order'),
    );
  }

  return parseApiResponse<ExportServiceOrder>(response);
};

const deleteExportOrder = async (id: string): Promise<void> => {
  const response = await apiFetch(getExportOrdersUrl(`/v1/export-orders/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to delete export order'),
    );
  }
};

const assignPackingList = async (
  id: string,
  payload: ExportServiceOrderPackingListAssignPayload,
): Promise<ApiResponse<ExportServiceOrder>> => {
  const response = await apiFetch(
    getExportOrdersUrl(`/v1/export-orders/${id}/packing-lists/assign`),
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
      await extractErrorMessage(response, 'Failed to assign packing list'),
    );
  }

  return parseApiResponse<ExportServiceOrder>(response);
};

const unassignPackingList = async (
  id: string,
  payload: ExportServiceOrderPackingListAssignPayload,
): Promise<ApiResponse<ExportServiceOrder>> => {
  const response = await apiFetch(
    getExportOrdersUrl(`/v1/export-orders/${id}/packing-lists/unassign`),
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
      await extractErrorMessage(response, 'Failed to unassign packing list'),
    );
  }

  return parseApiResponse<ExportServiceOrder>(response);
};

const transferPackingList = async (
  id: string,
  payload: ExportServiceOrderPackingListTransferPayload,
): Promise<ApiResponse<ExportServiceOrder>> => {
  const response = await apiFetch(
    getExportOrdersUrl(`/v1/export-orders/${id}/packing-lists/transfer`),
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
      await extractErrorMessage(response, 'Failed to transfer packing list'),
    );
  }

  return parseApiResponse<ExportServiceOrder>(response);
};

export const exportServiceOrdersApi = {
  getAll: getExportOrders,
  getById: getExportOrderById,
  create: createExportOrder,
  update: updateExportOrder,
  approve: approveExportOrder,
  delete: deleteExportOrder,
  assignPackingList,
  unassignPackingList,
  transferPackingList,
};
