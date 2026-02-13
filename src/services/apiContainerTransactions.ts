import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ApiResponse,
  ContainerTransaction,
  ContainerTransactionCreateForm,
  PaginatedResponse,
} from '@/features/containers/types';

const BASE_PATH = '/v1/container-transactions';

const toUrl = (
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
) => {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return buildEndpointURL('container', `${path}${query ? `?${query}` : ''}`);
};

const parse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (response.status === 204) {
    return { statusCode: response.status, data: null as T };
  }
  const payload = await response.json();
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload as ApiResponse<T>;
  }
  return { statusCode: response.status, data: payload as T };
};

export interface ContainerTransactionListParams {
  order?: string;
  page?: number;
  itemsPerPage?: number;
  totalItemCount?: number;
  containerNumber?: string;
  cycleId?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const listContainerTransactions = async (
  params: ContainerTransactionListParams = {},
): Promise<ApiResponse<PaginatedResponse<ContainerTransaction>>> => {
  const response = await apiFetch(toUrl(BASE_PATH, params));
  if (!response.ok) {
    throw new Error('Failed to load container transactions');
  }
  return parse<PaginatedResponse<ContainerTransaction>>(response);
};

export interface ContainerTransactionsByContainerParams
  extends ContainerTransactionListParams {
  includeAll?: boolean;
}

export const listContainerTransactionsByContainer = async (
  containerNumber: string,
  params: ContainerTransactionsByContainerParams = {},
): Promise<ApiResponse<PaginatedResponse<ContainerTransaction>>> => {
  const response = await apiFetch(
    toUrl(`/v1/containers/${encodeURIComponent(containerNumber)}/transactions`, params),
  );
  if (!response.ok) {
    throw new Error(`Failed to load transactions for container ${containerNumber}`);
  }
  return parse<PaginatedResponse<ContainerTransaction>>(response);
};

export const createContainerTransaction = async (
  payload: ContainerTransactionCreateForm,
): Promise<ApiResponse<ContainerTransaction>> => {
  const response = await apiFetch(toUrl(BASE_PATH), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create container transaction');
  }
  return parse<ContainerTransaction>(response);
};

export const getContainerTransaction = async (
  id: string,
): Promise<ApiResponse<ContainerTransaction>> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${id}`));
  if (!response.ok) {
    throw new Error(`Failed to load container transaction ${id}`);
  }
  return parse<ContainerTransaction>(response);
};

export const deleteContainerTransaction = async (id: string): Promise<void> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${id}`), {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete container transaction ${id}`);
  }
};

export const containerTransactionsApi = {
  getAll: listContainerTransactions,
  getById: getContainerTransaction,
  create: createContainerTransaction,
  delete: deleteContainerTransaction,
  listByContainer: listContainerTransactionsByContainer,
};
