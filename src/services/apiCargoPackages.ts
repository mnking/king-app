import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type { CargoPackageRecord, CargoPackageStorePayload, GeneratePackageCodeResponse } from '@/features/cargo-package-storage/types';

const getCargoPackageUrl = (endpoint: string) => buildEndpointURL('forwarder', endpoint);

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

const unwrap = <T>(json: any): T => (json?.data ? json.data : json);

export const getCargoPackages = async (
  packingListId: string,
  page = 1,
  itemsPerPage = 50,
): Promise<CargoPackageRecord[]> => {
  const params = new URLSearchParams({
    packingListId,
    page: page.toString(),
    itemsPerPage: itemsPerPage.toString(),
  });
  const response = await apiFetch(
    getCargoPackageUrl(`/v1/cargo-packages?${params.toString()}`),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch cargo packages'),
    );
  }

  const json = await response.json();
  const data = unwrap<{ results?: CargoPackageRecord[] } | CargoPackageRecord[]>(json);
  if (Array.isArray(data)) return data;
  if (data?.results) return data.results;
  return [];
};

export interface PaginatedCargoPackages {
  results: CargoPackageRecord[];
  total: number;
}

export const getCargoPackagesPage = async (
  packingListId: string,
  page = 1,
  itemsPerPage = 50,
): Promise<PaginatedCargoPackages> => {
  const params = new URLSearchParams({
    packingListId,
    page: page.toString(),
    itemsPerPage: itemsPerPage.toString(),
  });
  const response = await apiFetch(
    getCargoPackageUrl(`/v1/cargo-packages?${params.toString()}`),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch cargo packages'),
    );
  }

  const json = await response.json();
  const data = unwrap<{ results?: CargoPackageRecord[]; total?: number } | CargoPackageRecord[]>(json);
  const results = Array.isArray(data) ? data : data?.results ?? [];
  const total = Array.isArray(data) ? results.length : data?.total ?? results.length;

  return { results, total };
};

interface FetchByStatusParams {
  packingListId: string;
  status: PositionStatus | 'CHECKOUT' | 'STORED';
  itemsPerPage?: number;
}

interface FetchByPackingListParams {
  packingListId: string;
  itemsPerPage?: number;
}

export const fetchCargoPackagesByStatus = async ({
  packingListId,
  status,
  itemsPerPage = 500,
}: FetchByStatusParams): Promise<PaginatedCargoPackages> => {
  const cappedPerPage = Math.min(itemsPerPage, 1000);
  let page = 1;
  let total = 0;
  const results: CargoPackageRecord[] = [];

  while (true) {
    const params = new URLSearchParams({
      packingListId,
      status,
      page: page.toString(),
      itemsPerPage: cappedPerPage.toString(),
    });

    const response = await apiFetch(
      getCargoPackageUrl(`/v1/cargo-packages?${params.toString()}`),
      { method: 'GET' },
    );

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, 'Failed to fetch cargo packages'),
      );
    }

    const json = await response.json();
    const data = unwrap<{ results?: CargoPackageRecord[]; total?: number } | CargoPackageRecord[]>(json);
    const pageResults = Array.isArray(data) ? data : data?.results ?? [];
    const pageTotal = Array.isArray(data) ? pageResults.length : data?.total ?? pageResults.length;

    if (!total) {
      total = pageTotal;
    }

    results.push(...pageResults);

    const isLastPage = results.length >= pageTotal || pageResults.length < cappedPerPage;
    if (isLastPage) {
      break;
    }

    page += 1;
  }

  return { results, total: total || results.length };
};

export const fetchCargoPackagesByPackingList = async ({
  packingListId,
  itemsPerPage = 500,
}: FetchByPackingListParams): Promise<PaginatedCargoPackages> => {
  const cappedPerPage = Math.min(itemsPerPage, 1000);
  let page = 1;
  let total = 0;
  const results: CargoPackageRecord[] = [];

  while (true) {
    const params = new URLSearchParams({
      packingListId,
      page: page.toString(),
      itemsPerPage: cappedPerPage.toString(),
    });

    const response = await apiFetch(
      getCargoPackageUrl(`/v1/cargo-packages?${params.toString()}`),
      { method: 'GET' },
    );

    if (!response.ok) {
      throw new Error(
        await extractErrorMessage(response, 'Failed to fetch cargo packages'),
      );
    }

    const json = await response.json();
    const data = unwrap<{ results?: CargoPackageRecord[]; total?: number } | CargoPackageRecord[]>(json);
    const pageResults = Array.isArray(data) ? data : data?.results ?? [];
    const pageTotal = Array.isArray(data) ? pageResults.length : data?.total ?? pageResults.length;

    if (!total) {
      total = pageTotal;
    }

    results.push(...pageResults);

    const isLastPage = results.length >= pageTotal || pageResults.length < cappedPerPage;
    if (isLastPage) {
      break;
    }

    page += 1;
  }

  return { results, total: total || results.length };
};

export const fetchCargoPackageCount = async (
  packingListId: string,
): Promise<number> => {
  const params = new URLSearchParams({
    packingListId,
    page: '1',
    itemsPerPage: '1',
  });

  const response = await apiFetch(
    getCargoPackageUrl(`/v1/cargo-packages?${params.toString()}`),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch cargo packages'),
    );
  }

  const json = await response.json();
  const data = unwrap<
    { results?: CargoPackageRecord[]; total?: number } | CargoPackageRecord[]
  >(json);

  if (Array.isArray(data)) return data.length;
  if (typeof data?.total === 'number') return data.total;
  if (data?.results) return data.results.length;
  return 0;
};

export const generatePackageCode = async (
  packageId: string,
): Promise<GeneratePackageCodeResponse> => {
  const response = await apiFetch(
    getCargoPackageUrl(`/v1/cargo-packages/${packageId}/generate-code`),
    { method: 'POST' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to generate package code'),
    );
  }

  const json = await response.json();
  return unwrap<GeneratePackageCodeResponse>(json);
};

export const storeCargoPackages = async (
  payload: CargoPackageStorePayload,
): Promise<void> => {
  const response = await apiFetch(
    getCargoPackageUrl('/v1/cargo-packages/store'),
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
      await extractErrorMessage(response, 'Failed to store cargo packages'),
    );
  }
};

export interface CheckoutCargoPackagesPayload {
  packingListId: string;
  packageIds: string[];
  note?: string;
}

export const checkoutCargoPackages = async (
  payload: CheckoutCargoPackagesPayload,
): Promise<void> => {
  const response = await apiFetch(
    getCargoPackageUrl('/v1/cargo-packages/checkout'),
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
      await extractErrorMessage(response, 'Failed to checkout cargo packages'),
    );
  }
};

export const cargoPackagesApi = {
  getAll: getCargoPackages,
  getPage: getCargoPackagesPage,
  generateCode: generatePackageCode,
  store: storeCargoPackages,
  fetchByStatus: fetchCargoPackagesByStatus,
  fetchByPackingList: fetchCargoPackagesByPackingList,
  getCountByPackingList: fetchCargoPackageCount,
  checkout: checkoutCargoPackages,
};
