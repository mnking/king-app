import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  CargoPackageRecord,
  CargoPackageStorePayload,
  GeneratePackageCodeResponse,
} from '@/features/cargo-package-handover/types';

const getCargoPackageHandoverUrl = (endpoint: string) => buildEndpointURL('forwarder', endpoint);

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
    getCargoPackageHandoverUrl(`/v1/cargo-packages?${params.toString()}`),
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

export const generatePackageCode = async (
  packageId: string,
): Promise<GeneratePackageCodeResponse> => {
  const response = await apiFetch(
    getCargoPackageHandoverUrl(`/v1/cargo-packages/${packageId}/generate-code`),
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

export const handoverCargoPackages = async (
  payload: CargoPackageStorePayload,
): Promise<void> => {
  const response = await apiFetch(
    getCargoPackageHandoverUrl('/v1/cargo-packages/handover'),
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
      await extractErrorMessage(response, 'Failed to handover cargo packages'),
    );
  }
};

export const cargoPackageHandoverApi = {
  getAll: getCargoPackages,
  generateCode: generatePackageCode,
  handover: handoverCargoPackages,
};
