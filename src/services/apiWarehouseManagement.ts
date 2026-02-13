import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ApiResponse,
  PaginatedResponse,
  WarehousePackageListItem,
  WarehousePackageListQueryParams,
  RelocateCargoPackagePayload,
  WarehousePackingListStoredItem,
  WarehousePackingListQueryParams,
} from '@/features/warehouse-management/types';

const getLocationsPackageUrl = (endpoint: string) =>
  buildEndpointURL('cfs', endpoint);
const getForwarderCargoPackageUrl = (endpoint: string) =>
  buildEndpointURL('forwarder', endpoint);
const getForwarderPackingListUrl = (endpoint: string) =>
  buildEndpointURL('forwarder', endpoint);

const appendQueryParams = (params?: WarehousePackageListQueryParams) => {
  const searchParams = new URLSearchParams();
  if (!params) return searchParams.toString();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.itemsPerPage)
    searchParams.set('itemsPerPage', params.itemsPerPage.toString());
  if (params.order && Object.keys(params.order).length) {
    searchParams.set('order', JSON.stringify(params.order));
  }
  if (params.locationIds?.length) {
    params.locationIds.forEach((id) => searchParams.append('locationIds', id));
  }
  if (params.packageNo) searchParams.set('packageNo', params.packageNo);
  if (params.packingListId) searchParams.set('packingListId', params.packingListId);
  if (params.packingListNumber)
    searchParams.set('packingListNumber', params.packingListNumber);
  if (params.hblCode) searchParams.set('hblCode', params.hblCode);
  if (params.hblId) searchParams.set('hblId', params.hblId);
  if (params.forwarderName) searchParams.set('forwarderName', params.forwarderName);
  if (params.forwarderId) searchParams.set('forwarderId', params.forwarderId);
  if (params.locationStatus) searchParams.set('locationStatus', params.locationStatus);
  if (typeof params.inCfsOnly === 'boolean') {
    searchParams.set('inCfsOnly', String(params.inCfsOnly));
  }

  return searchParams.toString();
};

const appendPackingListQueryParams = (params?: WarehousePackingListQueryParams) => {
  const searchParams = new URLSearchParams();
  if (!params) return searchParams.toString();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.itemsPerPage)
    searchParams.set('itemsPerPage', params.itemsPerPage.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.status) {
    const statusValues = Array.isArray(params.status) ? params.status : [params.status];
    statusValues.forEach((status) => searchParams.append('status', status));
  }
  if (params.documentStatus) {
    const documentStatuses = Array.isArray(params.documentStatus)
      ? params.documentStatus
      : [params.documentStatus];
    documentStatuses.forEach((status) => searchParams.append('documentStatus', status));
  }
  if (params.workingStatus) {
    const workingStatuses = Array.isArray(params.workingStatus)
      ? params.workingStatus
      : [params.workingStatus];
    workingStatuses.forEach((status) => searchParams.append('workingStatus', status));
  }
  if (params.directionFlow) searchParams.set('directionFlow', params.directionFlow);
  if (params.forwarderId) searchParams.set('forwarderId', params.forwarderId);
  if (params.hblId) searchParams.set('hblId', params.hblId);
  if (params.cargoType) searchParams.set('cargoType', params.cargoType);
  if (params.containerNumber) searchParams.set('containerNumber', params.containerNumber);
  if (params.eta) searchParams.set('eta', params.eta);
  if (typeof params.hasStoredPackages === 'boolean') {
    searchParams.set('hasStoredPackages', String(params.hasStoredPackages));
  }
  if (params.storedLocationId)
    searchParams.set('storedLocationId', params.storedLocationId);
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
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return fallback;
  } catch {
    return fallback;
  }
};

const normalizeLocationPackagesResponse = async (
  response: Response,
): Promise<ApiResponse<PaginatedResponse<WarehousePackageListItem>>> => {
  const data = (await response.json()) as unknown;
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return data as ApiResponse<PaginatedResponse<WarehousePackageListItem>>;
  }

  return {
    statusCode: response.status,
    data: data as PaginatedResponse<WarehousePackageListItem>,
  };
};

const normalizePackingListsResponse = async (
  response: Response,
): Promise<ApiResponse<PaginatedResponse<WarehousePackingListStoredItem>>> => {
  const data = (await response.json()) as unknown;
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'statusCode' in data
  ) {
    return data as ApiResponse<PaginatedResponse<WarehousePackingListStoredItem>>;
  }

  return {
    statusCode: response.status,
    data: data as PaginatedResponse<WarehousePackingListStoredItem>,
  };
};

export const getLocationPackages = async (
  params?: WarehousePackageListQueryParams,
): Promise<ApiResponse<PaginatedResponse<WarehousePackageListItem>>> => {
  const query = appendQueryParams(params);
  const url = getLocationsPackageUrl(
    query ? `/v1/locations/packages?${query}` : '/v1/locations/packages',
  );

  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to fetch location packages',
      ),
    );
  }

  return normalizeLocationPackagesResponse(response);
};

export const getPackingListsWithStoredPackages = async (
  params?: WarehousePackingListQueryParams,
): Promise<ApiResponse<PaginatedResponse<WarehousePackingListStoredItem>>> => {
  const query = appendPackingListQueryParams({ ...params, hasStoredPackages: true });
  const url = getForwarderPackingListUrl(
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

  return normalizePackingListsResponse(response);
};

export const getPackingListsByStoredLocation = async (
  params: WarehousePackingListQueryParams,
): Promise<ApiResponse<PaginatedResponse<WarehousePackingListStoredItem>>> => {
  const query = appendPackingListQueryParams({ ...params, hasStoredPackages: true });
  const url = getForwarderPackingListUrl(
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

  return normalizePackingListsResponse(response);
};

export const relocateCargoPackage = async (
  payload: RelocateCargoPackagePayload,
): Promise<void> => {
  const response = await apiFetch(
    getForwarderCargoPackageUrl('/v1/cargo-packages/relocate'),
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
      await extractErrorMessage(response, 'Failed to relocate cargo package'),
    );
  }
};
