import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  HblBillingCalculationRequest,
  HblBillingCalculationResponse,
} from '@/features/cargo-package-delivery-commercial/types';

const getBillingUrl = (endpoint: string) => buildEndpointURL('billing', endpoint);

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

export const calculateHblBilling = async (
  payload: HblBillingCalculationRequest,
): Promise<HblBillingCalculationResponse> => {
  const response = await apiFetch(getBillingUrl('/v1/hbl-billing/calculation'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to calculate HBL billing'),
    );
  }

  const json = await response.json();
  return unwrap<HblBillingCalculationResponse>(json);
};

export const billingApi = {
  calculateHblBilling,
};
