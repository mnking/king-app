import { env, buildEndpointURL, isRealAPI } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import { toUtcISOString } from '@/shared/utils/dateTimeUtils';
import type { CargoReleaseStatus } from '@/shared/constants/container-status';
import type {
  BookingOrder,
  BookingOrderCreateForm,
  BookingOrderUpdateForm,
  BookingOrdersQueryParams,
  ApiResponse,
  PaginatedResponse,
  ContainerFormData,
  HBLFormData,
  BookingOrderContainer,
  BookingOrderHBL,
} from '@/features/booking-orders/types';
import type { Container } from '@/features/containers/types';
import type { PlanContainer } from '@/shared/features/plan/types';

export interface BookingOrderContainerAvailabilityParams {
  containerNo?: string;
  forwarderId?: string;
  forwarderCode?: string;
  orderStatus?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface BookingOrderContainerUpdatePayload {
  sealNumber?: string | null;
  eta?: string | null;
  containerStatus?: string | null;
  cargoReleaseStatus?: CargoReleaseStatus;
  allowStuffingOrDestuffing?: boolean;
}

export interface BookingOrderContainerReceivePayload {
  truckNo: string;
  receivedAt?: string;
  receivedType?: 'NORMAL' | 'PROBLEM' | 'ADJUSTED_DOCUMENT';
  notes?: string | null;
  documents?: string[];
  photos?: string[];
  containerNumber?: string;
  containerSeal?: string;
}

export type CustomsCfsImportRequestType =
  | 'CFS_IMPORT_IDENTIFICATION'
  | 'CFS_IMPORT_GET_IN';

export interface CustomsDeclarationEventAckResponse {
  eventType: string;
  status: string;
  transactionId: string;
}

export interface CustomsImportSubmissionStatusResponse {
  declarationNumber: string;
  eventType: string;
  operationMode: string;
  transactionId: string;
  stateCode: string | null;
  status: string | null;
  message: string | null;
  requestNumber: string | null;
  requestDate: string | null;
  rawResponse: Record<string, unknown>;
  source: 'realtime' | 'history';
  refreshed: boolean;
  lastUpdated: string | null;
}

// Helper function to get API URL for CFS endpoints
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
    `📦 CFS API: ${isRealAPI('cfs') ? 'Real API' : 'MSW Mock'} - /api/cfs`,
  );
}

// ===========================
// Summary Field Serialization/Deserialization
// ===========================

/**
 * Serialize container form data to API payload format.
 * Maps form fields to `summary` JSONB object and normalizes date fields.
 */
export const serializeContainerToPayload = (formData: ContainerFormData) => {
  const {
    typeCode,
    tareWeightKg,
    cargoNature,
    cargoProperties,
    isAtYard,
    yardFreeFrom,
    yardFreeTo,
    extractFrom,
    extractTo,
    ...rest
  } = formData;

  return {
    ...rest,
    yardFreeFrom: toUtcISOString(yardFreeFrom),
    yardFreeTo: toUtcISOString(yardFreeTo),
    extractFrom: toUtcISOString(extractFrom),
    extractTo: toUtcISOString(extractTo),
    summary: {
      typeCode,
      tareWeightKg,
      cargo_nature: cargoNature,
      cargo_properties: cargoProperties ?? null,
      is_atyard: isAtYard ?? false,
    },
  };
};

/**
 * Deserialize container from API response.
 * Extracts `summary` fields to top-level for form state.
 *
 * @note cargo_nature and cargo_properties are preserved for backward compatibility
 * with existing data, but are no longer displayed or edited in the UI (v1.1+).
 */
export const deserializeContainerFromResponse = (
  apiData: BookingOrderContainer,
): ContainerFormData => {
  const { summary, ...rest } = apiData;
  const hbls = Array.isArray(apiData.hbls) ? apiData.hbls : [];

  // console.log('🔍 Deserializing container:', {
  //   containerNo: apiData.containerNo,
  //   summary,
  //   extractedCargoNature: summary?.cargo_nature,
  //   extractedCargoProperties: summary?.cargo_properties,
  //   extractedIsAtYard: summary?.is_atyard,
  // });

  const deserialized = {
    ...rest,
    typeCode: summary?.typeCode,
    tareWeightKg: summary?.tareWeightKg,
    cargoNature: summary?.cargo_nature,
    cargoProperties: summary?.cargo_properties,
    isAtYard: summary?.is_atyard ?? false,
    hbls: hbls.map(deserializeHBLFromResponse),
  };

  // console.log('✅ Deserialized result:', {
  //   containerNo: deserialized.containerNo,
  //   cargoNature: deserialized.cargoNature,
  //   cargoProperties: deserialized.cargoProperties,
  //   isAtYard: deserialized.isAtYard,
  // });

  return deserialized;
};

/**
 * Serialize HBL form data to API payload format.
 * Maps form fields to `summary` JSONB object.
 */
export const serializeHBLToPayload = (formData: HBLFormData) => {
  const {
    receivedAt,
    issuerName,
    shipper,
    consignee,
    pol,
    pod,
    vesselName,
    voyageNumber,
    packages,
    customsStatus,
    ...rest
  } = formData;
  void customsStatus;

  return {
    ...rest,
    summary: {
      receivedAt,
      issuerName,
      shipper,
      consignee,
      pol,
      pod,
      vesselName,
      voyageNumber,
      packages,
    },
  };
};

/**
 * Deserialize HBL from API response.
 * Extracts `summary` fields to top-level for form state.
 */
export const deserializeHBLFromResponse = (apiData: BookingOrderHBL): HBLFormData => {
  const { summary, ...rest } = apiData;

  return {
    ...rest,
    receivedAt: summary?.receivedAt,
    issuerName: summary?.issuerName,
    shipper: summary?.shipper,
    consignee: summary?.consignee,
    pol: summary?.pol,
    pod: summary?.pod,
    vesselName: summary?.vesselName,
    voyageNumber: summary?.voyageNumber,
    packages: summary?.packages,
    customsStatus: summary?.customsStatus,
  };
};

// ===========================
// Booking Order API Methods
// ===========================

export const getBookingOrders = async (
  params?: BookingOrdersQueryParams,
): Promise<ApiResponse<PaginatedResponse<BookingOrder>>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.itemsPerPage)
    queryParams.append('itemsPerPage', params.itemsPerPage.toString());
  if (params?.status && params.status !== 'all')
    queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.agentId) queryParams.append('agentId', params.agentId);
  if (params?.orderBy) queryParams.append('orderBy', params.orderBy);
  if (params?.orderDir) queryParams.append('orderDir', params.orderDir);

  const response = await apiFetch(getCFSUrl(`/v1/booking-orders?${queryParams}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch booking orders: ${response.statusText}`);
  }

  const data = await response.json();

  // Deserialize summary fields for frontend consumption
  if (data.data?.results) {
    data.data.results = data.data.results.map((order: BookingOrder) => {
      if (order.containers) {
        return {
          ...order,
          containers: order.containers.map((container: BookingOrderContainer) =>
            deserializeContainerFromResponse(container),
          ),
        };
      }
      return order;
    });
  }

  return data;
};

export const getBookingOrderById = async (id: string): Promise<ApiResponse<BookingOrder>> => {
  const response = await apiFetch(getCFSUrl(`/v1/booking-orders/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch booking order: ${response.statusText}`);
  }

  const data = await response.json();

  // Deserialize summary fields for frontend consumption
  if (data.data?.containers) {
    data.data.containers = data.data.containers.map((container: BookingOrderContainer) =>
      deserializeContainerFromResponse(container),
    );
  }

  return data;
};

export const createBookingOrder = async (
  formData: BookingOrderCreateForm,
): Promise<ApiResponse<BookingOrder>> => {
  const normalizedFormData = {
    ...formData,
    eta: toUtcISOString(formData.eta),
  };

  // Serialize containers with summary fields
  const containers = normalizedFormData.containers.map((container) => {
    const serializedContainer = serializeContainerToPayload(container);
    return {
      ...serializedContainer,
      hbls: container.hbls.map(serializeHBLToPayload),
    };
  });

  const payload = {
    ...normalizedFormData,
    containers,
  };

  if (env.enableLogging) {
    console.log('📤 Creating booking order with payload:', JSON.stringify(payload, null, 2));
  }

  const response = await apiFetch(getCFSUrl('/v1/booking-orders'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));
    console.error('❌ Booking Order Creation Error:', JSON.stringify(errorBody, null, 2));

    // Handle specific error cases
    if (response.status === 404) {
      throw new Error(
        errorBody.message ||
          'Referenced entity not found (Agent, Vessel, Container, or HBL). Please verify all references.',
      );
    }

    if (response.status === 409) {
      throw new Error(
        errorBody.message ||
          'Conflict detected. This operation cannot be completed due to a uniqueness constraint.',
      );
    }

    // Validation errors
    if (errorBody.metaData && Array.isArray(errorBody.metaData)) {
      const validationErrors = errorBody.metaData.join(', ');
      throw new Error(`Validation failed: ${validationErrors}`);
    }

    throw new Error(errorBody.message || `Failed to create booking order: ${response.statusText}`);
  }

  const responseData = await response.json();

  // Deserialize summary fields for frontend consumption
  if (responseData.data?.containers) {
    responseData.data.containers = responseData.data.containers.map(
      (container: BookingOrderContainer) => deserializeContainerFromResponse(container),
    );
  }

  return responseData;
};

export const updateBookingOrder = async (
  id: string,
  formData: Partial<BookingOrderUpdateForm>,
): Promise<ApiResponse<BookingOrder>> => {
  let payload: any = {
    ...formData,
    eta: toUtcISOString(formData.eta),
  };

  // If containers are being updated, serialize them
  if (formData.containers) {
    const containers = formData.containers.map((container) => {
      const serializedContainer = serializeContainerToPayload(container);
      return {
        ...serializedContainer,
        hbls: container.hbls.map(serializeHBLToPayload),
      };
    });
    payload.containers = containers;
  }

  // Remove undefined values to avoid sending them to the backend
  payload = Object.fromEntries(Object.entries(payload).filter(([_, value]) => value !== undefined));

  if (env.enableLogging) {
    console.log('📤 Updating booking order with payload:', JSON.stringify(payload, null, 2));
  }

  const response = await apiFetch(getCFSUrl(`/v1/booking-orders/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));
    console.error('❌ Booking Order Update Error:', JSON.stringify(errorBody, null, 2));

    if (response.status === 404) {
      throw new Error(
        errorBody.message || 'Booking order not found. It may have been deleted.',
      );
    }

    if (response.status === 409) {
      throw new Error(
        errorBody.message ||
          'Conflict detected. This operation cannot be completed due to a uniqueness constraint.',
      );
    }

    // Validation errors
    if (errorBody.metaData && Array.isArray(errorBody.metaData)) {
      const validationErrors = errorBody.metaData.join(', ');
      throw new Error(`Validation failed: ${validationErrors}`);
    }

    throw new Error(errorBody.message || `Failed to update booking order: ${response.statusText}`);
  }

  const responseData = await response.json();

  // Deserialize summary fields for frontend consumption
  if (responseData.data?.containers) {
    responseData.data.containers = responseData.data.containers.map(
      (container: BookingOrderContainer) => deserializeContainerFromResponse(container),
    );
  }

  return responseData;
};

export interface BookingOrderPlanUpdateContainer {
  id?: string | null;
  containerId: string;
  isPriority?: boolean;
  customsStatus?: string;
  customsClearedAt?: string | null;
  cargoReleaseStatus?: string;
  cargoReleasedAt?: string | null;
  extractFrom?: string | null;
  extractTo?: string | null;
  containerFile?: ContainerFile | null;
}

export interface BookingOrderPlanUpdatePayload {
  eta?: string | null;
  ata?: string | null;
  containers?: BookingOrderPlanUpdateContainer[];
}

export const updateBookingOrderPlan = async (
  id: string,
  payload: BookingOrderPlanUpdatePayload,
): Promise<ApiResponse<BookingOrder>> => {
  const normalized: BookingOrderPlanUpdatePayload = {
    ...payload,
    eta:
      payload.eta === undefined
        ? undefined
        : payload.eta
          ? toUtcISOString(payload.eta)
          : null,
    ata:
      payload.ata === undefined
        ? undefined
        : payload.ata
          ? toUtcISOString(payload.ata)
          : null,
    containers: payload.containers?.map((container) => ({
      id: container.id ?? undefined,
      containerId: container.containerId,
      isPriority: container.isPriority ?? false,
      customsStatus: container.customsStatus,
      customsClearedAt: container.customsClearedAt ?? null,
      cargoReleaseStatus: container.cargoReleaseStatus,
      cargoReleasedAt: container.cargoReleasedAt ?? null,
      extractFrom: container.extractFrom ?? null,
      extractTo: container.extractTo ?? null,
      containerFile: container.containerFile ?? null,
    })),
  };

  const cleaned = Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined),
  );

  const response = await apiFetch(getCFSUrl(`/v1/booking-orders/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cleaned),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));
    console.error('❌ Booking Order Plan Update Error:', JSON.stringify(errorBody, null, 2));

    throw new Error(
      errorBody.message ||
        'Failed to update booking order plan. Please try again.',
    );
  }

  const responseData = await response.json();

  // Deserialize summary fields for frontend consumption
  if (responseData.data?.containers) {
    responseData.data.containers = responseData.data.containers.map(
      (container: BookingOrderContainer) => deserializeContainerFromResponse(container),
    );
  }

  return responseData;
};

export const deleteBookingOrder = async (id: string): Promise<void> => {
  const response = await apiFetch(getCFSUrl(`/v1/booking-orders/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to delete booking order: ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If parsing fails, use the status text or response text
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
  }
};

export const approveBookingOrder = async (id: string): Promise<ApiResponse<BookingOrder>> => {
  const response = await apiFetch(getCFSUrl(`/v1/booking-orders/${id}/approve`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));

    // Handle specific error cases
    if (response.status === 400) {
      // Validation errors from backend
      if (errorBody.metaData && Array.isArray(errorBody.metaData)) {
        const validationErrors = errorBody.metaData.join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      }

      throw new Error(
        errorBody.message ||
          'Cannot approve booking order. Please ensure all required fields are filled.',
      );
    }

    if (response.status === 409) {
      throw new Error(
        errorBody.message || 'Cannot approve booking order. A conflict was detected.',
      );
    }

    throw new Error(errorBody.message || `Failed to approve booking order: ${response.statusText}`);
  }

  const responseData = await response.json();

  // Deserialize summary fields for frontend consumption
  if (responseData.data?.containers) {
    responseData.data.containers = responseData.data.containers.map(
      (container: BookingOrderContainer) => deserializeContainerFromResponse(container),
    );
  }

  return responseData;
};

export const getAvailableBookingOrderContainers = async (
  params: BookingOrderContainerAvailabilityParams = {},
): Promise<ApiResponse<PaginatedResponse<BookingOrderContainer>>> => {
  const queryParams = new URLSearchParams();
  if (params.containerNo) queryParams.append('containerNo', params.containerNo);
  if (params.forwarderId) queryParams.append('forwarderId', params.forwarderId);
  if (params.forwarderCode) queryParams.append('forwarderCode', params.forwarderCode);
  if (params.orderStatus) queryParams.append('orderStatus', params.orderStatus);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.itemsPerPage)
    queryParams.append('itemsPerPage', params.itemsPerPage.toString());
  const queryString = queryParams.toString();
  const url = getCFSUrl(
    `/v1/booking-order-containers/available${queryString ? `?${queryString}` : ''}`,
  );

  const response = await apiFetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch available booking order containers: ${response.statusText}`,
    );
  }

  const data: ApiResponse<PaginatedResponse<BookingOrderContainer>> = await response.json();

  if (data.data?.results) {
    data.data = {
      ...data.data,
      results: data.data.results.map((container: BookingOrderContainer) =>
        deserializeContainerFromResponse(container),
      ),
    };
  }

  return data;
};

export const updateBookingOrderContainer = async (
  id: string,
  payload: BookingOrderContainerUpdatePayload,
): Promise<ApiResponse<BookingOrderContainer>> => {
  const response = await apiFetch(getCFSUrl(`/v1/booking-order-containers/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));
    throw new Error(errorBody.message || `Failed to update container: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.data) {
    data.data = deserializeContainerFromResponse(data.data as BookingOrderContainer);
  }

  return data;
};

export const receiveBookingOrderContainer = async (
  id: string,
  payload: BookingOrderContainerReceivePayload,
): Promise<ApiResponse<PlanContainer>> => {
  const response = await apiFetch(
    getCFSUrl(`/v1/booking-order-containers/${id}/receive`),
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: response.statusText,
    }));
    throw new Error(
      errorBody.message || `Failed to receive container: ${response.statusText}`,
    );
  }

  return response.json();
};

const parseApiError = async (response: Response, fallbackMessage: string) => {
  const errorBody = await response
    .json()
    .catch(() => ({ message: response.statusText }));
  return errorBody.message || fallbackMessage;
};

const unwrapApiData = <T>(payload: unknown): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export const submitCustomsImportIdentification = async (
  bookingOrderContainerId: string,
): Promise<CustomsDeclarationEventAckResponse> => {
  const response = await apiFetch(
    getCFSUrl('/v1/customs/cfs-import/identification'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingOrderContainerId }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await parseApiError(
        response,
        `Failed to submit customs identification: ${response.statusText}`,
      ),
    );
  }

  return unwrapApiData<CustomsDeclarationEventAckResponse>(await response.json());
};

export const submitCustomsImportGetIn = async (
  bookingOrderContainerId: string,
): Promise<CustomsDeclarationEventAckResponse> => {
  const response = await apiFetch(getCFSUrl('/v1/customs/cfs-import/get-in'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookingOrderContainerId }),
  });

  if (!response.ok) {
    throw new Error(
      await parseApiError(
        response,
        `Failed to submit customs get-in: ${response.statusText}`,
      ),
    );
  }

  return unwrapApiData<CustomsDeclarationEventAckResponse>(await response.json());
};

export const getCustomsImportSubmissionStatus = async (params: {
  bookingOrderContainerId: string;
  requestType: CustomsCfsImportRequestType;
}): Promise<CustomsImportSubmissionStatusResponse> => {
  const queryParams = new URLSearchParams();
  queryParams.set('bookingOrderContainerId', params.bookingOrderContainerId);
  queryParams.set('requestType', params.requestType);

  const response = await apiFetch(
    getCFSUrl(`/v1/customs/cfs-import/submissions/status?${queryParams.toString()}`),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(
      await parseApiError(
        response,
        `Failed to fetch customs submission status: ${response.statusText}`,
      ),
    );
  }

  return unwrapApiData<CustomsImportSubmissionStatusResponse>(await response.json());
};

// ===========================
// Empty Container Return Operations
// ===========================

export const getEmptyContainers = async (params: {
  page?: number;
  itemsPerPage?: number;
} = {}): Promise<ApiResponse<PaginatedResponse<Container>>> => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.itemsPerPage)
    queryParams.append('itemsPerPage', params.itemsPerPage.toString());
  const queryString = queryParams.toString();

  const response = await apiFetch(
    getCFSUrl(`/v1/containers${queryString ? `?${queryString}` : ''}`),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch empty containers: ${response.statusText}`);
  }

  return response.json();
};

export const returnEmptyContainers = async (
  containerNumbers: string[],
): Promise<ApiResponse<Container[]>> => {
  const response = await apiFetch(getCFSUrl('/v1/containers/return'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ containerNumbers }),
  });

  if (!response.ok) {
    throw new Error(`Failed to return empty containers: ${response.statusText}`);
  }

  return response.json();
};

// ===========================
// Organized API Exports
// ===========================

export const bookingOrdersApi = {
  getAll: getBookingOrders,
  getById: getBookingOrderById,
  create: createBookingOrder,
  update: updateBookingOrder,
  updatePlan: updateBookingOrderPlan,
  delete: deleteBookingOrder,
  approve: approveBookingOrder,
};

export const bookingOrderContainersApi = {
  getAvailable: getAvailableBookingOrderContainers,
  update: updateBookingOrderContainer,
  receive: receiveBookingOrderContainer,
};

export const customsCfsImportApi = {
  submitIdentification: submitCustomsImportIdentification,
  submitGetIn: submitCustomsImportGetIn,
  getSubmissionStatus: getCustomsImportSubmissionStatus,
};
