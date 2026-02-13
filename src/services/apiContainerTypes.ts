import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ApiResponse,
  ContainerType,
  ContainerTypeCreateForm,
  ContainerTypeUpdateForm,
  PaginatedResponse,
} from '@/features/containers/types';

const BASE_PATH = '/v1/container-types';

const toUrl = (path: string) => buildEndpointURL('container', path);

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

export const listContainerTypes = async (): Promise<
  ApiResponse<PaginatedResponse<ContainerType>>
> => {
  const response = await apiFetch(toUrl(BASE_PATH));
  if (!response.ok) {
    throw new Error('Failed to load container types');
  }
  return parse<PaginatedResponse<ContainerType>>(response);
};

export const getContainerType = async (code: string): Promise<ApiResponse<ContainerType>> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${encodeURIComponent(code)}`));
  if (!response.ok) {
    throw new Error(`Failed to load container type ${code}`);
  }
  return parse<ContainerType>(response);
};

export const createContainerType = async (
  payload: ContainerTypeCreateForm,
): Promise<ApiResponse<ContainerType>> => {
  const response = await apiFetch(toUrl(BASE_PATH), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create container type');
  }
  return parse<ContainerType>(response);
};

export const updateContainerType = async (
  code: string,
  payload: ContainerTypeUpdateForm,
): Promise<ApiResponse<ContainerType>> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${encodeURIComponent(code)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to update container type ${code}`);
  }
  return parse<ContainerType>(response);
};

export const deleteContainerType = async (code: string): Promise<void> => {
  const response = await apiFetch(toUrl(`${BASE_PATH}/${encodeURIComponent(code)}`), {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete container type ${code}`);
  }
};

export const containerTypesApi = {
  getAll: listContainerTypes,
  getByCode: getContainerType,
  create: createContainerType,
  update: updateContainerType,
  delete: deleteContainerType,
};
