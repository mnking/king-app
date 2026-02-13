import { env, buildEndpointURL, isRealAPI } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ApiResponse,
  PaginatedResponse,
  ShippingLine,
  ShippingLineCreateForm,
  ShippingLineStats,
  ShippingLineUpdateForm,
  ShippingLinesQueryParams,
} from '@/features/shipping-lines/types';

// Helper function to get API URL for Carrier endpoints
const getCarrierUrl = (endpoint: string): string => {
  if (env.enableLogging) {
    console.log('🔍 getCarrierUrl debug:', {
      endpoint,
      useRealAPI: isRealAPI('carrier'),
      baseUrl: '/api/carrier',
    });
  }

  if (isRealAPI('carrier')) {
    const fullUrl = buildEndpointURL('carrier', endpoint);
    if (env.enableLogging) {
      console.log('📡 Real API URL constructed:', fullUrl);
    }
    return fullUrl;
  }

  // For MSW, prepend /api/carrier to match MSW handler paths
  const mswUrl = `/api/carrier${endpoint}`;
  if (env.enableLogging) {
    console.log('🎭 MSW URL returned:', mswUrl);
  }
  return mswUrl;
};

// Log which API is being used
if (env.enableLogging) {
  console.log(
    `📦 Carrier API: ${isRealAPI('carrier') ? 'Real API' : 'MSW Mock'} - /api/carrier`,
  );
}

// ===========================
// Shipping Line API Methods
// ===========================

export const getShippingLines = async (
  params?: ShippingLinesQueryParams,
): Promise<ApiResponse<PaginatedResponse<ShippingLine>>> => {
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

  const response = await apiFetch(getCarrierUrl(`/v1/shipping-lines?${queryParams}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shipping lines: ${response.statusText}`);
  }

  return response.json();
};

export const getShippingLineById = async (
  id: string,
): Promise<ApiResponse<ShippingLine>> => {
  const response = await apiFetch(getCarrierUrl(`/v1/shipping-lines/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shipping line: ${response.statusText}`);
  }

  return response.json();
};

export const getShippingLineStats = async (): Promise<
  ApiResponse<ShippingLineStats>
> => {
  const response = await apiFetch(getCarrierUrl('/v1/shipping-lines/stats'), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shipping line stats: ${response.statusText}`);
  }

  return response.json();
};

export const createShippingLine = async (
  data: ShippingLineCreateForm,
): Promise<ApiResponse<ShippingLine>> => {
  const response = await apiFetch(getCarrierUrl('/v1/shipping-lines'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create shipping line: ${response.statusText}`);
  }

  return response.json();
};

export const updateShippingLine = async (
  id: string,
  data: ShippingLineUpdateForm,
): Promise<ApiResponse<ShippingLine>> => {
  const response = await apiFetch(getCarrierUrl(`/v1/shipping-lines/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update shipping line: ${response.statusText}`);
  }

  return response.json();
};

export const deleteShippingLine = async (id: string): Promise<void> => {
  const response = await apiFetch(getCarrierUrl(`/v1/shipping-lines/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to delete shipping line: ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
  }
};

// ===========================
// Organized API Exports
// ===========================

export const shippingLinesApi = {
  getAll: getShippingLines,
  getById: getShippingLineById,
  getStats: getShippingLineStats,
  create: createShippingLine,
  update: updateShippingLine,
  delete: deleteShippingLine,
};

export type {
  ApiResponse,
  PaginatedResponse,
  ShippingLine,
  ShippingLineStats,
  ShippingLinesQueryParams,
};
