import { buildEndpointURL, env, isRealAPI } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ApiResponse,
  Container,
  ContainerCreateForm,
  ContainerDetail,
  ContainerTransaction,
  ContainerUpdateForm,
  PaginatedResponse,
} from '@/features/containers/types';

const SERVICE_KEY = 'container' as const;
const BASE_PATH = '/v1/containers';

const log = (...args: unknown[]) => {
  if (env.enableLogging) {
    console.log('[api:containers]', ...args);
  }
};

const toUrl = (path: string, params?: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  const endpoint = `${path}${query ? `?${query}` : ''}`;
  const url = buildEndpointURL(SERVICE_KEY, endpoint);
  log(`→ ${url}`);
  return url;
};

const parseJson = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (response.status === 204) {
    return { statusCode: response.status, data: null as T };
  }

  const payload = await response.json();
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload as ApiResponse<T>;
  }

  return {
    statusCode: response.status,
    data: payload as T,
  };
};

export interface ContainerListParams {
  order?: string;
  page?: number;
  itemsPerPage?: number;
  totalItemCount?: number;
  cycle?: boolean;
}

export const listContainers = async (
  params: ContainerListParams = {},
): Promise<ApiResponse<PaginatedResponse<Container>>> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}`, params));
  if (!response.ok) {
    throw new Error(`Failed to fetch containers (${response.status})`);
  }
  return parseJson<PaginatedResponse<Container>>(response);
};

export interface ContainerDetailParams {
  cycle?: boolean;
}

export const getContainer = async (
  id: string,
  params: ContainerDetailParams = {},
): Promise<ApiResponse<ContainerDetail>> => {
  const queryParams = { cycle: params.cycle };
  const response = await apiFetch(toUrl(`${BASE_PATH}/${id}`, queryParams));
  if (!response.ok) {
    throw new Error(`Failed to fetch container ${id}`);
  }
  return parseJson<ContainerDetail>(response);
};

export const getContainerByNumber = async (
  number: string,
  params: ContainerDetailParams = {},
): Promise<ApiResponse<ContainerDetail>> => {
  const queryParams = { cycle: params.cycle};
  const response = await apiFetch(
    toUrl(`${BASE_PATH}/by-number/${encodeURIComponent(number)}`, queryParams),
  );
  if (!response.ok) {
    const error: Error & { status?: number } = new Error(
      `Failed to fetch container ${number}`,
    );
    error.status = response.status;
    throw error;
  }
  return parseJson<ContainerDetail>(response);
};

export const createContainer = async (
  payload: ContainerCreateForm,
): Promise<ApiResponse<Container>> => {
  const response = await apiFetch(toUrl(BASE_PATH), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create container (${response.status})`);
  }
  return parseJson<Container>(response);
};

export const updateContainer = async (
  id: string,
  payload: ContainerUpdateForm,
): Promise<ApiResponse<Container>> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to update container (${response.status})`);
  }
  return parseJson<Container>(response);
};

export const deleteContainer = async (id: string): Promise<void> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${id}`), {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete container (${response.status})`);
  }
};

export const getContainerLastTransaction = async (
  id: string,
): Promise<ApiResponse<ContainerTransaction>> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${id}/last-transaction`));
  if (!response.ok) {
    throw new Error(`Failed to fetch last transaction for container ${id}`);
  }
  return parseJson<ContainerTransaction>(response);
};

export const containersApi = {
  getAll: listContainers,
  getById: getContainer,
  getByNumber: getContainerByNumber,
  create: createContainer,
  update: updateContainer,
  delete: deleteContainer,
  getLastTransaction: getContainerLastTransaction,
};

log(`service mode = ${isRealAPI(SERVICE_KEY) ? 'real' : 'msw'}`);
