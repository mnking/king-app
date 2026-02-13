import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type { ApiResponse } from '@/features/zones-locations/types';
import type {
  CargoInspectionSession,
  CargoPackage,
  FlowType,
  LineInspection,
  PackageCheckData,
  PackageInspection,
  PackageStatusUpdate,
} from '@/shared/features/cargo-inspection/types';

const getCargoInspectionUrl = (endpoint: string) =>
  buildEndpointURL('forwarder', endpoint);

const extractErrorMessage = async (response: Response, fallback: string) => {
  try {
    const text = await response.text();
    if (!text) return fallback;
    const data = JSON.parse(text);
    if (typeof data === 'string') return data;
    if (Array.isArray(data?.metaData)) {
      return data.metaData
        .filter((item: unknown) => typeof item === 'string')
        .join('\n') || fallback;
    }
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return fallback;
  } catch {
    return fallback;
  }
};

export const createInspectionSession = async (
  packingListId: string,
  flowType: FlowType,
): Promise<ApiResponse<CargoInspectionSession>> => {
  const response = await apiFetch(
    getCargoInspectionUrl('/v1/cargo-inspection-sessions'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packingListId, flowType }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to create cargo inspection session',
      ),
    );
  }

  return response.json();
};

export const getInspectionSessions = async (
  packingListId: string,
  flowType?: FlowType,
): Promise<ApiResponse<CargoInspectionSession[]>> => {
  const params = new URLSearchParams({ packingListId });
  if (flowType) params.set('flowType', flowType);
  const response = await apiFetch(
    getCargoInspectionUrl(
      `/v1/cargo-inspection-sessions?${params.toString()}`,
    ),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to fetch cargo inspection sessions',
      ),
    );
  }

  return response.json();
};

export const getSessionLineInspections = async (
  sessionId: string,
): Promise<ApiResponse<LineInspection[]>> => {
  const response = await apiFetch(
    getCargoInspectionUrl(
      `/v1/cargo-inspection-sessions/${sessionId}/line-inspections`,
    ),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to fetch session line inspections',
      ),
    );
  }

  return response.json();
};

export const getLineInspectionDetail = async (
  lineInspectionId: string,
): Promise<ApiResponse<LineInspection>> => {
  const response = await apiFetch(
    getCargoInspectionUrl(`/v1/line-inspections/${lineInspectionId}`),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to fetch line inspection detail',
      ),
    );
  }

  return response.json();
};

export const recordPackageInspection = async (
  lineInspectionId: string,
  data: PackageCheckData,
): Promise<ApiResponse<PackageInspection>> => {
  const mapConditionStatus = (status: PackageCheckData['statusCheck']) => {
    switch (status) {
      case 'package_damaged':
        return 'PACKAGE_DAMAGED';
      case 'cargo_broken':
        return 'CARGO_DAMAGED';
      default:
        return 'NORMAL';
    }
  };

  const mapRegulatoryStatus = (status: PackageCheckData['customsCheck']) => {
    switch (status) {
      case 'passed':
        return 'PASSED';
      case 'on_hold':
        return 'ON_HOLD';
      default:
        return 'UNINSPECTED';
    }
  };

  const response = await apiFetch(
    getCargoInspectionUrl(
      `/v1/line-inspections/${lineInspectionId}/packages`,
    ),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkingPackageCount: data.packageCount,
        conditionStatus: mapConditionStatus(data.statusCheck),
        regulatoryStatus: mapRegulatoryStatus(data.customsCheck),
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to record package inspection',
      ),
    );
  }

  return response.json();
};

type LineCompletionPayload = Pick<
  LineInspection,
  | 'actualPackageCount'
  | 'actualCargoQuantity'
  | 'regulatoryCargoType'
  | 'regulatoryCargoDescription'
>;

export const completeLineInspection = async (
  lineInspectionId: string,
  payload: LineCompletionPayload,
): Promise<ApiResponse<LineInspection>> => {
  const response = await apiFetch(
    getCargoInspectionUrl(`/v1/line-inspections/${lineInspectionId}/complete`),
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
      await extractErrorMessage(
        response,
        'Failed to complete line inspection',
      ),
    );
  }

  return response.json();
};

export const updateLineInspection = async (
  lineInspectionId: string,
  payload: LineCompletionPayload,
): Promise<ApiResponse<LineInspection>> => {
  const response = await apiFetch(
    getCargoInspectionUrl(`/v1/line-inspections/${lineInspectionId}`),
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to update line inspection',
      ),
    );
  }

  return response.json();
};

export type BusinessFlowDirection = 'import' | 'export';

export type BusinessFlowStepCode =
  | 'create'
  | 'inspect'
  | 'store'
  | 'select'
  | 'handover'
  | (string & {});

export interface BusinessFlowStep {
  code: BusinessFlowStepCode;
  fromStatus: string;
  toStatus: string;
}

export interface BusinessFlowConfig {
  direction: BusinessFlowDirection;
  steps: BusinessFlowStep[];
}

export const getBusinessFlowConfig = async (
  flowName: string,
): Promise<ApiResponse<BusinessFlowConfig>> => {
  const response = await apiFetch(
    getCargoInspectionUrl(
      `/v1/package-transactions/flows/${encodeURIComponent(flowName)}`,
    ),
    { method: 'GET' },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Business flow "${flowName}" not found`);
    }
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to fetch business flow configuration',
      ),
    );
  }

  return response.json();
};

export const getCargoPackages = async (
  packingListId: string,
  page = 1,
  itemsPerPage = 50,
): Promise<ApiResponse<CargoPackage[]>> => {
  const params = new URLSearchParams({
    packingListId,
    page: page.toString(),
    itemsPerPage: itemsPerPage.toString(),
  });
  const response = await apiFetch(
    getCargoInspectionUrl(`/v1/cargo-packages?${params.toString()}`),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch cargo packages'),
    );
  }

  return response.json();
};

export const updateCargoPackages = async (
  _packingListId: string,
  _updates: PackageStatusUpdate,
  _packageIds: string[],
) => {
  // TODO: Implement when backend OUTBOUND save API is available
  throw new Error('Feature coming soon - backend API not ready');
};

export const cargoInspectionApi = {
  createSession: createInspectionSession,
  getSessions: getInspectionSessions,
  getSessionLines: getSessionLineInspections,
  getLineDetail: getLineInspectionDetail,
  getFlowConfig: getBusinessFlowConfig,
  recordPackageInspection,
  completeLineInspection,
  updateLineInspection,
  getCargoPackages,
  updateCargoPackages,
};
