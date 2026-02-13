import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ApiResponse,
  PaginatedResponse,
} from '@/features/zones-locations/types';
import type {
  CreatePackageTransactionPayload,
  PackageTransaction,
  PackageTransactionQueryParams,
} from '@/features/cfs-cargo-package-delivery/types/package-transaction-types';

const getForwarderUrl = (endpoint: string) =>
  buildEndpointURL('forwarder', endpoint);

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

const appendQueryParams = (params?: PackageTransactionQueryParams) => {
  const searchParams = new URLSearchParams();
  if (!params) return searchParams.toString();

  if (params.code) searchParams.set('code', params.code);
  if (params.packageIds?.length) {
    params.packageIds.forEach((id) => searchParams.append('packageIds', id));
  }
  if (params.status) searchParams.set('status', params.status);
  if (params.businessProcessFlow) {
    searchParams.set('businessProcessFlow', String(params.businessProcessFlow));
  }
  if (params.packingListId !== undefined) {
    if (params.packingListId === null) {
      searchParams.set('packingListId', 'null');
    } else {
      searchParams.set('packingListId', params.packingListId);
    }
  }
  if (params.partyType !== undefined) {
    if (params.partyType === null) {
      searchParams.set('partyType', 'null');
    } else {
      searchParams.set('partyType', params.partyType);
    }
  }
  if (params.itemsPerPage) {
    searchParams.set('itemsPerPage', String(params.itemsPerPage));
  }
  if (params.page) searchParams.set('page', String(params.page));
  if (params.order && Object.keys(params.order).length) {
    searchParams.set('order', JSON.stringify(params.order));
  }

  return searchParams.toString();
};

export const getPackageTransactions = async (
  params?: PackageTransactionQueryParams,
): Promise<ApiResponse<PaginatedResponse<PackageTransaction>>> => {
  const query = appendQueryParams(params);
  const url = getForwarderUrl(
    query ? `/v1/package-transactions?${query}` : '/v1/package-transactions',
  );

  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch package transactions'),
    );
  }
  return response.json();
};

export const getPackageTransactionById = async (
  id: string,
): Promise<ApiResponse<PackageTransaction>> => {
  const response = await apiFetch(
    getForwarderUrl(`/v1/package-transactions/${id}`),
    { method: 'GET' },
  );
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch package transaction'),
    );
  }
  return response.json();
};

export const createPackageTransaction = async (
  payload: CreatePackageTransactionPayload,
): Promise<ApiResponse<PackageTransaction>> => {
  const response = await apiFetch(getForwarderUrl('/v1/package-transactions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to create package transaction'),
    );
  }

  return response.json();
};

export const updatePackageTransaction = async (
  id: string,
  payload: Pick<CreatePackageTransactionPayload, 'packageIds' | 'partyName' | 'partyType'>,
): Promise<ApiResponse<PackageTransaction>> => {
  const response = await apiFetch(
    getForwarderUrl(`/v1/package-transactions/${id}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to update package transaction'),
    );
  }

  return response.json();
};

export const completePackageTransaction = async (
  id: string,
): Promise<ApiResponse<PackageTransaction>> => {
  const response = await apiFetch(
    getForwarderUrl(`/v1/package-transactions/${id}/complete`),
    { method: 'PATCH' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to complete package transaction'),
    );
  }

  return response.json();
};

export const deletePackageTransaction = async (id: string): Promise<void> => {
  const response = await apiFetch(getForwarderUrl(`/v1/package-transactions/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to delete package transaction'),
    );
  }
};

export type HandlePackageTransactionStepPayload =
  | {
      step: 'create';
      lineId: string;
      packageCount?: number;
    }
  | {
      step: 'inspect';
      packageIds: string[];
      conditionStatus?: 'NORMAL' | 'PACKAGE_DAMAGED' | 'CARGO_DAMAGED';
      regulatoryStatus?: 'UNINSPECTED' | 'PASSED' | 'ON_HOLD';
    }
  | {
      step: 'store';
      packageIds: string[];
      toLocationId?: string[];
    }
  | {
    step: 'handover';
    packageIds: string[];
  }
  | {
    step: 'stuffing';
    packageIds: string[];
  };

export interface HandlePackageTransactionStepResponse {
  step: HandlePackageTransactionStepPayload['step'];
  packages: Array<{
    packageId: string;
    positionStatus: string;
    movementAt: string;
    conditionStatus: string | null;
    regulatoryStatus: string | null;
  }>;
}

export const handlePackageTransactionStep = async (
  packageTransactionId: string,
  payload: HandlePackageTransactionStepPayload,
): Promise<ApiResponse<HandlePackageTransactionStepResponse>> => {
  const response = await apiFetch(
    getForwarderUrl(`/v1/package-transactions/${packageTransactionId}/handle-step`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to handle package transaction step'),
    );
  }

  return response.json();
};

export const packageTransactionsApi = {
  getAll: getPackageTransactions,
  getById: getPackageTransactionById,
  create: createPackageTransaction,
  update: updatePackageTransaction,
  complete: completePackageTransaction,
  delete: deletePackageTransaction,
  handleStep: handlePackageTransactionStep,
};
