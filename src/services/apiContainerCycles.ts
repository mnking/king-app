import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ApiResponse,
  ContainerCycle,
  ContainerCycleCreateForm,
  ContainerCycleEndForm,
  PaginatedResponse,
} from '@/features/containers/types';

const BASE_PATH = '/v1/container-cycles';

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

export interface ContainerCycleListParams {
  order?: string;
  page?: number;
  itemsPerPage?: number;
  totalItemCount?: number;
  containerNumber?: string;
  code?: string;
  operationMode?: string;
  startEvent?: string;
  endEvent?: string;
  sealNumber?: string;
  status?: string;
  isActive?: boolean;
}

export const listContainerCycles = async (
  params: ContainerCycleListParams = {},
): Promise<ApiResponse<PaginatedResponse<ContainerCycle>>> => {
  const url = toUrl(BASE_PATH, params);
  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error('Failed to load container cycles');
  }
  return parse<PaginatedResponse<ContainerCycle>>(response);
};

export const createContainerCycle = async (
  payload: ContainerCycleCreateForm,
): Promise<ApiResponse<ContainerCycle>> => {
  const response = await apiFetch(toUrl(BASE_PATH), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create container cycle');
  }
  return parse<ContainerCycle>(response);
};

export const getContainerCycle = async (id: string): Promise<ApiResponse<ContainerCycle>> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${id}`));
  if (!response.ok) {
    throw new Error(`Failed to fetch container cycle ${id}`);
  }
  return parse<ContainerCycle>(response);
};

export const getContainerCycleByCode = async (
  code: string,
): Promise<ApiResponse<ContainerCycle>> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/by-code/${encodeURIComponent(code)}`));
  if (!response.ok) {
    throw new Error(`Failed to fetch container cycle ${code}`);
  }
  return parse<ContainerCycle>(response);
};

export const deleteContainerCycle = async (id: string): Promise<void> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${id}`), {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete container cycle ${id}`);
  }
};

export const endContainerCycle = async (
  id: string,
  payload: ContainerCycleEndForm,
): Promise<ApiResponse<ContainerCycle>> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${id}/end`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to end container cycle ${id}`);
  }
  return parse<ContainerCycle>(response);
};

export const containerCyclesApi = {
  getAll: listContainerCycles,
  getById: getContainerCycle,
  getByCode: getContainerCycleByCode,
  create: createContainerCycle,
  delete: deleteContainerCycle,
  end: endContainerCycle,
};
