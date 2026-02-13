import { useQuery } from '@tanstack/react-query';
import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type { ExportOrder } from '../types';

const getExportOrdersUrl = (endpoint: string) => buildEndpointURL('cfs', endpoint);

const extractErrorMessage = async (response: Response, fallback: string) => {
  try {
    const text = await response.text();
    if (!text) return fallback;
    const data = JSON.parse(text);
    if (typeof data === 'string') return data;
    if (Array.isArray(data?.errors)) return data.errors.join(', ');
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return fallback;
  } catch {
    return fallback;
  }
};

const unwrap = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export const exportOrderQueryKeys = {
  all: ['exportOrders'] as const,
  details: () => [...exportOrderQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...exportOrderQueryKeys.details(), id] as const,
};

export const fetchExportOrderById = async (id: string): Promise<ExportOrder> => {
  const response = await apiFetch(getExportOrdersUrl(`/v1/export-orders/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch export order'),
    );
  }

  const payload = await response.json();
  const unwrapped = unwrap<ExportOrder>(payload as unknown);
  return unwrapped;
};

export const useExportOrder = (id: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: exportOrderQueryKeys.detail(id),
    queryFn: () => fetchExportOrderById(id),
    enabled: options?.enabled ?? Boolean(id),
    staleTime: 60_000,
    retry: 1,
  });
