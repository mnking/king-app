import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ApiResponse,
  CustomsDeclarationCreatePayload,
  CustomsDeclarationsListQueryParams,
  CustomsDeclarationsListResponse,
  CustomsDeclarationResponse,
  CustomsDeclarationUpdatePayload,
} from '@/features/customs-declaration/types';

const getCustomsDeclarationUrl = (endpoint: string) =>
  buildEndpointURL('forwarder', endpoint);

const appendQueryParams = (params?: CustomsDeclarationsListQueryParams) => {
  const searchParams = new URLSearchParams();
  if (!params) return searchParams.toString();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.itemsPerPage)
    searchParams.set('itemsPerPage', params.itemsPerPage.toString());
  if (params.order && Object.keys(params.order).length) {
    searchParams.set('order', JSON.stringify(params.order));
  }
  if (params.code) searchParams.set('code', params.code);
  if (params.hblId) searchParams.set('hblId', params.hblId);
  if (params.registeredFrom)
    searchParams.set('registeredFrom', params.registeredFrom);
  if (params.registeredTo) searchParams.set('registeredTo', params.registeredTo);

  return searchParams.toString();
};

const extractErrorMessage = async (response: Response, fallback: string) => {
  try {
    const text = await response.text();
    if (!text) return fallback;
    const data = JSON.parse(text);
    if (typeof data === 'string') return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return fallback;
  } catch {
    return fallback;
  }
};

const normalizeResponse = async (
  response: Response,
): Promise<CustomsDeclarationResponse> => {
  const data = (await response.json()) as unknown;
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return (data as { data: CustomsDeclarationResponse }).data;
  }

  return data as CustomsDeclarationResponse;
};

export const getCustomsDeclaration = async (
  id: string,
): Promise<CustomsDeclarationResponse> => {
  const response = await apiFetch(
    getCustomsDeclarationUrl(`/v1/customs-declarations/${id}`),
    {
      method: 'GET',
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to fetch customs declaration',
      ),
    );
  }

  return normalizeResponse(response);
};

export const getCustomsDeclarations = async (
  params?: CustomsDeclarationsListQueryParams,
): Promise<ApiResponse<CustomsDeclarationsListResponse>> => {
  const query = appendQueryParams(params);
  const url = getCustomsDeclarationUrl(
    query ? `/v1/customs-declarations?${query}` : '/v1/customs-declarations',
  );

  const response = await apiFetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to fetch customs declarations',
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
    return data as ApiResponse<CustomsDeclarationsListResponse>;
  }

  return {
    statusCode: response.status,
    data: data as CustomsDeclarationsListResponse,
  };
};

export const createCustomsDeclaration = async (
  payload: CustomsDeclarationCreatePayload,
): Promise<CustomsDeclarationResponse> => {
  const response = await apiFetch(
    getCustomsDeclarationUrl('/v1/customs-declarations'),
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
      await extractErrorMessage(
        response,
        'Failed to create customs declaration',
      ),
    );
  }

  return normalizeResponse(response);
};

export const updateCustomsDeclaration = async (
  id: string,
  payload: CustomsDeclarationUpdatePayload,
): Promise<CustomsDeclarationResponse> => {
  const response = await apiFetch(
    getCustomsDeclarationUrl(`/v1/customs-declarations/${id}`),
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
        'Failed to update customs declaration',
      ),
    );
  }

  return normalizeResponse(response);
};

export const deleteCustomsDeclaration = async (id: string): Promise<void> => {
  const response = await apiFetch(
    getCustomsDeclarationUrl(`/v1/customs-declarations/${id}`),
    {
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to delete customs declaration',
      ),
    );
  }
};

export const approveCustomsDeclaration = async (
  id: string,
): Promise<CustomsDeclarationResponse> => {
  const response = await apiFetch(
    getCustomsDeclarationUrl(`/v1/customs-declarations/${id}/approve`),
    {
      method: 'POST',
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to approve customs declaration',
      ),
    );
  }

  return normalizeResponse(response);
};

export const customsDeclarationsApi = {
  getById: getCustomsDeclaration,
  getAll: getCustomsDeclarations,
  create: createCustomsDeclaration,
  update: updateCustomsDeclaration,
  approve: approveCustomsDeclaration,
  delete: deleteCustomsDeclaration,
};
