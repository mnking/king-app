import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';

export type BillableEntityType = 'CONTAINER' | 'HBL';

export type BillingPaymentStatus = 'PENDING' | 'DECLARED' | 'DONE';

export interface BillingChargeItem {
  id: string;
  category: string;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  metadata?: Record<string, unknown>;
}

export interface BillingPaymentRecord {
  id: string;
  expectedAmount?: number | null;
  actualAmount: number;
  discountAmount?: number | null;
  note?: string | null;
  receiptNumber?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
}

export interface BillingPaymentDetail {
  entityRef: string;
  entityType: BillableEntityType;
  status: BillingPaymentStatus;
  prepaidAmount: number;
  additionalAmount: number;
  totalAmount: number;
  prepayCharges: BillingChargeItem[];
  additionalCharges: BillingChargeItem[];
  paymentRecords: BillingPaymentRecord[];
}

export interface DeclarePrepayPayload {
  entityType: BillableEntityType;
  entityRef: string;
  forwarderId?: string;
  options: {
    containerNumber?: string;
    direction?: 'IMPORT' | 'EXPORT';
    containerTypeCode?: string;
    cargoStore?: {
      enabled: boolean;
      storageDays: number;
    };
  };
}

export interface ProcessPrepayPayload {
  actualAmount: number;
  note?: string;
  receiptNumber?: string;
}

const getBillingUrl = (endpoint: string) => buildEndpointURL('billing', endpoint);

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

export const getPaymentDetail = async (
  entityType: BillableEntityType,
  entityRef: string,
): Promise<BillingPaymentDetail | null> => {
  const response = await apiFetch(
    getBillingUrl(`/v1/payments/${entityType}/${entityRef}`),
    { method: 'GET' },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch payment detail'),
    );
  }

  const payload = await response.json();
  return unwrap<BillingPaymentDetail>(payload);
};

export const declarePrepay = async (
  payload: DeclarePrepayPayload,
): Promise<void> => {
  const response = await apiFetch(getBillingUrl('/v1/payments/declare-prepay'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to declare prepay'),
    );
  }
};

export const processPrepay = async (
  entityType: BillableEntityType,
  entityRef: string,
  payload: ProcessPrepayPayload,
): Promise<void> => {
  const response = await apiFetch(
    getBillingUrl(`/v1/payments/${entityType}/${entityRef}/process-prepay`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to record payment'),
    );
  }
};

export const completePrepay = async (
  entityType: BillableEntityType,
  entityRef: string,
): Promise<void> => {
  const response = await apiFetch(
    getBillingUrl(`/v1/payments/${entityType}/${entityRef}/complete`),
    { method: 'POST' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to complete payment'),
    );
  }
};

export const billingPaymentsApi = {
  getPaymentDetail,
  declarePrepay,
  processPrepay,
  completePrepay,
};
