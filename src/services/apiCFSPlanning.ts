import { env, buildEndpointURL, isRealAPI } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  ReceivePlan,
  UnplannedContainer,
  PlansQueryParams,
  CreatePlanRequest,
  UpdatePlanRequest,
  ChangePlanStatusRequest,
  ReceivePlanContainerRequest,
  RejectPlanContainerRequest,
  DeferPlanContainerRequest,
  UpdatePlanContainerDetailsRequest,
  ApiResponse,
  PaginatedResponse,
} from '@/shared/features/plan/types';
import type { PartialDestuffingContainer, UnplannedDestuffingContainer } from '@/features/destuffing-planning/types';

// Helper function to get API URL for CFS Planning endpoints
const getCFSUrl = (endpoint: string): string => {
  if (env.enableLogging) {
    console.log('🔍 getCFSUrl debug:', {
      endpoint,
      useRealAPI: isRealAPI('cfs'),
      baseUrl: '/api/cfs',
    });
  }

  if (isRealAPI('cfs')) {
    const fullUrl = buildEndpointURL('cfs', endpoint);
    if (env.enableLogging) {
      console.log('📡 Real API URL constructed:', fullUrl);
    }
    return fullUrl;
  }

  // For MSW, prepend /api/cfs to match MSW handler paths
  const mswUrl = `/api/cfs${endpoint}`;
  if (env.enableLogging) {
    console.log('🎭 MSW URL returned:', mswUrl);
  }
  return mswUrl;
};

// Log which API is being used
if (env.enableLogging) {
  console.log(
    `📦 CFS Planning API: ${isRealAPI('cfs') ? 'Real API' : 'MSW Mock'} - /api/cfs/v1/plans`,
  );
}

// ===========================
// Plan Operations
// ===========================

/**
 * Get paginated list of receive plans with optional filtering
 * GET /v1/plans
 */
export const getPlans = async (
  params?: PlansQueryParams,
): Promise<PaginatedResponse<ReceivePlan>> => {
  const queryParams = new URLSearchParams();

  if (params?.status) {
    queryParams.append('status', params.status);
  }
  if (params?.planType) {
    queryParams.append('planType', params.planType);
  }
  if (params?.page !== undefined) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.itemsPerPage !== undefined) {
    queryParams.append('itemsPerPage', params.itemsPerPage.toString());
  }
  if (params?.plannedStart?.from) {
    queryParams.append('plannedStart[from]', params.plannedStart.from);
  }
  if (params?.plannedStart?.to) {
    queryParams.append('plannedStart[to]', params.plannedStart.to);
  }
  if (params?.executionStart?.from) {
    queryParams.append('executionStart[from]', params.executionStart.from);
  }
  if (params?.executionStart?.to) {
    queryParams.append('executionStart[to]', params.executionStart.to);
  }
  if (params?.executionEnd?.from) {
    queryParams.append('executionEnd[from]', params.executionEnd.from);
  }
  if (params?.executionEnd?.to) {
    queryParams.append('executionEnd[to]', params.executionEnd.to);
  }
  if (params?.containerNumber) {
    queryParams.append('containerNumber', params.containerNumber);
  }
  if (params?.sealNumber) {
    queryParams.append('sealNumber', params.sealNumber);
  }
  if (params?.mblNumber) {
    queryParams.append('mblNumber', params.mblNumber);
  }
  if (params?.hblNumber) {
    queryParams.append('hblNumber', params.hblNumber);
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.orderBy) {
    queryParams.append('orderBy', params.orderBy);
  }
  if (params?.orderDir) {
    queryParams.append('orderDir', params.orderDir);
  }

  const queryString = queryParams.toString();
  const url = getCFSUrl(`/v1/plans${queryString ? `?${queryString}` : ''}`);

  if (env.enableLogging) {
    console.log('📡 Fetching plans:', url);
  }

  const response = await apiFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch plans: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data; // Unwrap ApiResponse to get PaginatedResponse
};

/**
 * Get single receive plan by ID
 * GET /v1/plans/{id}
 */
export const getPlanById = async (id: string): Promise<ApiResponse<ReceivePlan>> => {
  const url = getCFSUrl(`/v1/plans/${id}`);

  if (env.enableLogging) {
    console.log('📡 Fetching plan by ID:', url);
  }

  const response = await apiFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch plan: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Create new receive plan
 * POST /v1/plans
 */
export const createPlan = async (
  data: CreatePlanRequest,
): Promise<ApiResponse<ReceivePlan>> => {
  const url = getCFSUrl('/v1/plans');
  console.log('====================== Creating plan data:', data);
  const response = await apiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));

    // Handle specific error cases
    if (response.status === 404) {
      throw new Error(
        errorBody.message ||
        'Container not found. Please verify all container references.',
      );
    }

    if (response.status === 409) {
      throw new Error(
        errorBody.message ||
        'Conflict detected. This plan overlaps with an existing plan.',
      );
    }

    // Validation errors
    if (errorBody.metaData && Array.isArray(errorBody.metaData)) {
      const validationErrors = errorBody.metaData.join(', ');
      throw new Error(`Validation failed: ${validationErrors}`);
    }

    throw new Error(errorBody.message || `Failed to create plan: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Update existing receive plan
 * PATCH /v1/plans/{id}
 */
export const updatePlan = async (
  id: string,
  data: UpdatePlanRequest,
): Promise<ApiResponse<ReceivePlan>> => {
  const url = getCFSUrl(`/v1/plans/${id}`);

  if (env.enableLogging) {
    console.log('📤 Updating plan with payload:', JSON.stringify(data, null, 2));
  }

  const response = await apiFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));
    console.error('❌ Plan Update Error:', JSON.stringify(errorBody, null, 2));

    if (response.status === 404) {
      throw new Error(errorBody.message || 'Plan not found.');
    }

    if (response.status === 409) {
      throw new Error(
        errorBody.message ||
        'Conflict detected. This plan overlaps with an existing plan.',
      );
    }

    if (errorBody.metaData && Array.isArray(errorBody.metaData)) {
      const validationErrors = errorBody.metaData.join(', ');
      throw new Error(`Validation failed: ${validationErrors}`);
    }

    throw new Error(errorBody.message || `Failed to update plan: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Delete receive plan
 * DELETE /v1/plans/{id}
 */
export const deletePlan = async (id: string): Promise<ApiResponse<void>> => {
  const url = getCFSUrl(`/v1/plans/${id}`);

  if (env.enableLogging) {
    console.log('📤 Deleting plan:', id);
  }

  const response = await apiFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));
    console.error('❌ Plan Deletion Error:', JSON.stringify(errorBody, null, 2));

    if (response.status === 404) {
      throw new Error(errorBody.message || 'Plan not found.');
    }

    throw new Error(errorBody.message || `Failed to delete plan: ${response.statusText}`);
  }

  // DELETE endpoints typically return 204 No Content with empty body
  if (response.status === 204) {
    return { success: true, data: null } as ApiResponse<void>;
  }

  return response.json();
};

/**
 * Change plan status (e.g., SCHEDULED → DONE)
 * POST /v1/plans/{id}/status
 */
export const changePlanStatus = async (
  id: string,
  data: ChangePlanStatusRequest,
): Promise<ApiResponse<ReceivePlan>> => {
  const url = getCFSUrl(`/v1/plans/${id}/status`);

  if (env.enableLogging) {
    console.log('📤 Changing plan status:', { id, status: data.status });
  }

  const response = await apiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));
    console.error('❌ Plan Status Change Error:', JSON.stringify(errorBody, null, 2));

    if (response.status === 404) {
      throw new Error(errorBody.message || 'Plan not found.');
    }

    if (response.status === 400) {
      throw new Error(
        errorBody.message ||
        'Invalid status transition. Please check the current plan status.',
      );
    }

    throw new Error(errorBody.message || `Failed to change plan status: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Receive plan container
 * PATCH /v1/plans/{planId}/containers/{containerId}/receive
 */
export const receivePlanContainer = async (
  planId: string,
  containerId: string,
  data: ReceivePlanContainerRequest,
): Promise<ApiResponse<ReceivePlan>> => {
  const url = getCFSUrl(`/v1/plans/${planId}/containers/${containerId}/receive`);

  const response = await apiFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));

    throw new Error(errorBody.message || 'Failed to mark container as received.');
  }

  return response.json();
};

/**
 * Update plan container details (problem / adjusted document)
 * PATCH /v1/plans/{planId}/containers/{containerId}
 */
export const updatePlanContainerDetails = async (
  planId: string,
  containerId: string,
  data: UpdatePlanContainerDetailsRequest,
): Promise<ApiResponse<ReceivePlan>> => {
  const url = getCFSUrl(`/v1/plans/${planId}/containers/${containerId}`);

  const response = await apiFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));

    throw new Error(errorBody.message || 'Failed to update container details.');
  }

  return response.json();
};

/**
 * Reject plan container
 * PATCH /v1/plans/{planId}/containers/{containerId}/reject
 */
export const rejectPlanContainer = async (
  planId: string,
  containerId: string,
  data: RejectPlanContainerRequest,
): Promise<ApiResponse<ReceivePlan>> => {
  const url = getCFSUrl(`/v1/plans/${planId}/containers/${containerId}/reject`);

  const response = await apiFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));

    throw new Error(errorBody.message || 'Failed to reject container.');
  }

  return response.json();
};

/**
 * Defer plan container
 * PATCH /v1/plans/{planId}/containers/{containerId}/defer
 */
export const deferPlanContainer = async (
  planId: string,
  containerId: string,
  data: DeferPlanContainerRequest,
): Promise<ApiResponse<ReceivePlan>> => {
  const url = getCFSUrl(`/v1/plans/${planId}/containers/${containerId}/defer`);

  const response = await apiFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));

    throw new Error(errorBody.message || 'Failed to defer container.');
  }

  return response.json();
};

// ===========================
// Unplanned Container Operations
// ===========================

/**
 * Get list of unplanned containers (not assigned to any plan)
 * GET /v1/unplanned
 */
export const getUnplannedContainers = async (): Promise<ApiResponse<UnplannedContainer[]>> => {
  const url = getCFSUrl('/v1/unplanned');

  if (env.enableLogging) {
    console.log('📡 Fetching unplanned containers:', url);
  }

  const response = await apiFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch unplanned containers: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get list of unplanned containers waiting for destuffing plans.
 * GET /v1/destuffing/unplanned-containers?forwarderId=X
 * Note: Backend does not support search parameters yet (Phase 3b placeholder).
 */
export const getUnplannedDestuffingContainers = async (
  forwarderId?: string,
): Promise<ApiResponse<UnplannedDestuffingContainer[]>> => {
  const queryParams = new URLSearchParams();
  if (forwarderId) {
    queryParams.append('forwarderId', forwarderId);
  }
  const queryString = queryParams.toString();
  const url = getCFSUrl(
    `/v1/destuffing/unplanned-containers${queryString ? `?${queryString}` : ''}`,
  );

  if (env.enableLogging) {
    console.log('📡 Fetching destuffing unplanned containers:', url);
  }

  const response = await apiFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch destuffing unplanned containers: ${response.statusText}`,
    );
  }

  return response.json();
};

/**
 * List destuffing containers that were partially completed and resealed.
 * GET /v1/destuffing/partial-containers?forwarderId=X
 */
export const getPartialDestuffingContainers = async (
  forwarderId?: string,
): Promise<ApiResponse<PartialDestuffingContainer[]>> => {
  const queryParams = new URLSearchParams();
  if (forwarderId) {
    queryParams.append('forwarderId', forwarderId);
  }
  const queryString = queryParams.toString();
  const url = getCFSUrl(
    `/v1/destuffing/partial-containers${queryString ? `?${queryString}` : ''}`,
  );

  if (env.enableLogging) {
    console.log('📡 Fetching partial destuffing containers:', url);
  }

  const response = await apiFetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch partial destuffing containers: ${response.statusText}`,
    );
  }

  const json = await response.json();
  const data = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json)
      ? json
      : [];

  return { data };
};

// ===========================
// Container Assignment Operations (Phase 2)
// ===========================


export interface AssignContainerRequest {
  orderContainerId: string;
  hblIds?: string[];
  bypassStorageFlag?: boolean;
}

/**
 * Assign containers to plan (works for both RECEIVING and DESTUFFING plans)
 * POST /v1/plans/{planId}/container-assignments
 */
export const assignContainer = async (
  planId: string,
  assignments: AssignContainerRequest[],
): Promise<ApiResponse<ReceivePlan>> => {
  const url = getCFSUrl(`/v1/plans/${planId}/container-assignments`);

  // Debug logging
  console.log('📤 [API] Request body:', JSON.stringify(assignments, null, 2));

  if (env.enableLogging) {
    console.log('📤 Assigning containers:', { planId, assignments });
  }

  const response = await apiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignments),
  });

  console.log('📥 [API] Response received:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));

    console.error('❌ [API] Error response body:', errorBody);
    throw new Error(errorBody.message || `Failed to assign containers: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Unassign container from plan
 * DELETE /v1/plans/{planId}/container-assignments/{assignmentId}
 * Note: Deferred to Phase 2 - included for completeness
 */
export const unassignContainer = async (
  planId: string,
  assignmentId: string,
): Promise<ApiResponse<void>> => {
  const url = getCFSUrl(`/v1/plans/${planId}/container-assignments/${assignmentId}`);

  if (env.enableLogging) {
    console.log('📤 Unassigning container from plan:', { planId, assignmentId });
  }

  const response = await apiFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));

    if (response.status === 404) {
      throw new Error(errorBody.message || 'Assignment not found.');
    }

    throw new Error(errorBody.message || `Failed to unassign container: ${response.statusText}`);
  }

  // DELETE endpoints typically return 204 No Content with empty body
  if (response.status === 204) {
    return { success: true, data: null } as ApiResponse<void>;
  }

  return response.json();
};
