import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ExportPlan,
  ExportPlanListResponse,
  ExportPlanQueryParams,
  ExportPlanCreatePayload,
  ExportPlanUpdatePayload,
  ExportPlanContainer,
  ExportPlanContainerPayload,
  ExportPlanContainerSealPayload,
  ExportPlanContainerCustomsDeclarationPayload,
  ExportPlanContainerStatusPayload,
  ExportPlanStatusPayload,
  ExportPlanPackingListAssignmentPayload,
} from '@/features/stuffing-planning/types';

const getExportPlansUrl = (endpoint: string) => buildEndpointURL('cfs', endpoint);

const appendQueryParams = (params?: ExportPlanQueryParams) => {
  const searchParams = new URLSearchParams();
  if (!params) return searchParams.toString();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.itemsPerPage) searchParams.set('itemsPerPage', params.itemsPerPage.toString());
  if (params.status) searchParams.set('status', params.status);
  if (params.exportOrderId) searchParams.set('exportOrderId', params.exportOrderId);
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
    if (Array.isArray(data?.errors)) return data.errors.join(', ');
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return fallback;
  } catch {
    return fallback;
  }
};

const unwrapResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export const getExportPlans = async (
  params?: ExportPlanQueryParams,
): Promise<ExportPlanListResponse> => {
  const query = appendQueryParams(params);
  const url = getExportPlansUrl(
    query ? `/v1/export-plans?${query}` : '/v1/export-plans',
  );

  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch export plans'),
    );
  }

  const payload = await response.json();
  return unwrapResponse<ExportPlanListResponse>(payload);
};

const getExportPlanById = async (id: string): Promise<ExportPlan> => {
  const response = await apiFetch(getExportPlansUrl(`/v1/export-plans/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to fetch export plan'),
    );
  }

  const payload = await response.json();
  return unwrapResponse<ExportPlan>(payload);
};

const createExportPlan = async (
  payload: ExportPlanCreatePayload,
): Promise<ExportPlan> => {
  const response = await apiFetch(getExportPlansUrl('/v1/export-plans'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to create export plan'),
    );
  }

  const data = await response.json();
  return unwrapResponse<ExportPlan>(data);
};

const updateExportPlan = async (
  id: string,
  payload: ExportPlanUpdatePayload,
): Promise<ExportPlan> => {
  const response = await apiFetch(getExportPlansUrl(`/v1/export-plans/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to update export plan'),
    );
  }

  const data = await response.json();
  return unwrapResponse<ExportPlan>(data);
};

const deleteExportPlan = async (id: string): Promise<void> => {
  const response = await apiFetch(getExportPlansUrl(`/v1/export-plans/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to delete export plan'),
    );
  }
};

const changeExportPlanStatus = async (
  id: string,
  payload: ExportPlanStatusPayload,
): Promise<ExportPlan> => {
  const response = await apiFetch(
    getExportPlansUrl(`/v1/export-plans/${id}/status`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to change export plan status'),
    );
  }

  const data = await response.json();
  return unwrapResponse<ExportPlan>(data);
};

const createExportPlanContainer = async (
  planId: string,
  payload: ExportPlanContainerPayload,
): Promise<ExportPlanContainer> => {
  const response = await apiFetch(
    getExportPlansUrl(`/v1/export-plans/${planId}/containers`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to create plan container'),
    );
  }

  const data = await response.json();
  return unwrapResponse<ExportPlanContainer>(data);
};

const updateExportPlanContainer = async (
  planId: string,
  containerId: string,
  payload: ExportPlanContainerPayload,
): Promise<ExportPlanContainer> => {
  const response = await apiFetch(
    getExportPlansUrl(`/v1/export-plans/${planId}/containers/${containerId}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to update plan container'),
    );
  }

  const data = await response.json();
  return unwrapResponse<ExportPlanContainer>(data);
};

const deleteExportPlanContainer = async (
  planId: string,
  containerId: string,
): Promise<void> => {
  const response = await apiFetch(
    getExportPlansUrl(`/v1/export-plans/${planId}/containers/${containerId}`),
    { method: 'DELETE' },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to delete plan container'),
    );
  }
};

const changeExportPlanContainerStatus = async (
  planId: string,
  containerId: string,
  payload: ExportPlanContainerStatusPayload,
): Promise<ExportPlanContainer> => {
  const response = await apiFetch(
    getExportPlansUrl(`/v1/export-plans/${planId}/containers/${containerId}/status`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to change plan container status',
      ),
    );
  }

  const data = await response.json();
  return unwrapResponse<ExportPlanContainer>(data);
};

const sealExportPlanContainer = async (
  planId: string,
  containerId: string,
  payload: ExportPlanContainerSealPayload,
): Promise<ExportPlanContainer> => {
  const response = await apiFetch(
    getExportPlansUrl(
      `/v1/export-plans/${planId}/containers/${containerId}/seal`,
    ),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to seal plan container'),
    );
  }

  const data = await response.json();
  return unwrapResponse<ExportPlanContainer>(data);
};


const declareExportPlanContainerCustoms = async (
  planId: string,
  containerId: string,
  payload: ExportPlanContainerCustomsDeclarationPayload,
): Promise<ExportPlanContainer> => {
  const response = await apiFetch(
    getExportPlansUrl(
      `/v1/export-plans/${planId}/containers/${containerId}/customs-declaration`,
    ),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'Failed to declare container customs',
      ),
    );
  }

  const data = await response.json();
  return unwrapResponse<ExportPlanContainer>(data);
};

const assignExportPlanPackingLists = async (
  planId: string,
  payload: ExportPlanPackingListAssignmentPayload,
): Promise<ExportPlan> => {
  const response = await apiFetch(
    getExportPlansUrl(`/v1/export-plans/${planId}/packing-lists/assign`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'Failed to assign packing lists'),
    );
  }

  const data = await response.json();
  return unwrapResponse<ExportPlan>(data);
};

export const exportPlansApi = {
  getAll: getExportPlans,
  getById: getExportPlanById,
  create: createExportPlan,
  update: updateExportPlan,
  delete: deleteExportPlan,
  changeStatus: changeExportPlanStatus,
  createContainer: createExportPlanContainer,
  updateContainer: updateExportPlanContainer,
  deleteContainer: deleteExportPlanContainer,
  changeContainerStatus: changeExportPlanContainerStatus,
  sealContainer: sealExportPlanContainer,
  declareContainerCustoms: declareExportPlanContainerCustoms,
  assignPackingLists: assignExportPlanPackingLists,
};
