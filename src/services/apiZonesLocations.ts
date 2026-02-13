import { env, buildEndpointURL, isRealAPI } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type {
  Zone,
  Location,
  ZoneCreateForm,
  ZoneUpdateForm,
  LocationCreateForm,
  LocationUpdateForm,
  ApiResponse,
  PaginatedResponse,
  LocationLayoutRequest,
  LocationLayoutResponse,
} from '@/features/zones-locations/types';

// Helper function to get API URL for CFS endpoints
const getCfsUrl = (endpoint: string): string => {
  if (env.enableLogging) {
    console.log('🔍 getCfsUrl debug:', {
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
    `📦 Zones/Locations API: ${isRealAPI('cfs') ? 'Real API' : 'MSW Mock'} - /api/cfs`,
  );
}

// Zone API Methods
export const getZones = async (params?: {
  page?: number;
  itemsPerPage?: number;
  status?: string | string[];
}): Promise<ApiResponse<PaginatedResponse<Zone>>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.itemsPerPage)
    queryParams.append('itemsPerPage', params.itemsPerPage.toString());
  if (params?.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((status) => queryParams.append('status', status));
  }

  const response = await apiFetch(getCfsUrl(`/v1/zones?${queryParams}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch zones: ${response.statusText}`);
  }

  return response.json();
};

export const getZone = async (id: string): Promise<ApiResponse<Zone>> => {
  const response = await apiFetch(getCfsUrl(`/v1/zones/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch zone: ${response.statusText}`);
  }

  return response.json();
};

export const createZone = async (data: ZoneCreateForm): Promise<ApiResponse<Zone>> => {
  const response = await apiFetch(getCfsUrl('/v1/zones'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create zone: ${response.statusText}`);
  }

  return response.json();
};

export const updateZone = async (id: string, data: ZoneUpdateForm): Promise<ApiResponse<Zone>> => {
  const response = await apiFetch(getCfsUrl(`/v1/zones/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update zone: ${response.statusText}`);
  }

  return response.json();
};

export const updateZoneStatus = async (id: string, status: Zone['status']): Promise<ApiResponse<Zone>> => {
  const response = await apiFetch(getCfsUrl(`/v1/zones/${id}/status`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to update zone status: ${response.statusText}`;

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

  return response.json();
};

export const deleteZone = async (id: string): Promise<void> => {
  const response = await apiFetch(getCfsUrl(`/v1/zones/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to delete zone: ${response.statusText}`;

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

export const getZoneLocations = async (
  zoneId: string,
  params?: {
    page?: number;
    itemsPerPage?: number;
    status?: string | string[];
    packageCount?: '0' | '1' | 'many' | Array<'0' | '1' | 'many'>;
    search?: string;
    zoneName?: string;
  },
): Promise<ApiResponse<PaginatedResponse<Location>>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.itemsPerPage)
    queryParams.append('itemsPerPage', params.itemsPerPage.toString());
  if (params?.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((status) => queryParams.append('status', status));
  }
  if (params?.packageCount) {
    const counts = Array.isArray(params.packageCount)
      ? params.packageCount
      : [params.packageCount];
    counts.forEach((count) => queryParams.append('packageCount', count));
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.zoneName) {
    queryParams.append('zoneName', params.zoneName);
  }

  const response = await apiFetch(getCfsUrl(`/v1/zones/${zoneId}/locations?${queryParams}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch zone locations: ${response.statusText}`);
  }

  return response.json();
};

// Location API Methods
export const getLocations = async (params?: {
  page?: number;
  itemsPerPage?: number;
  status?: string | string[];
  packageCount?: '0' | '1' | 'many' | Array<'0' | '1' | 'many'>;
  search?: string;
  zoneName?: string;
  ids?: string[];
}): Promise<ApiResponse<PaginatedResponse<Location>>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.itemsPerPage)
    queryParams.append('itemsPerPage', params.itemsPerPage.toString());
  if (params?.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((status) => queryParams.append('status', status));
  }
  if (params?.packageCount) {
    const counts = Array.isArray(params.packageCount)
      ? params.packageCount
      : [params.packageCount];
    counts.forEach((count) => queryParams.append('packageCount', count));
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.zoneName) {
    queryParams.append('zoneName', params.zoneName);
  }
  if (params?.ids?.length) {
    params.ids.forEach((id) => queryParams.append('ids', id));
  }

  const response = await apiFetch(getCfsUrl(`/v1/locations?${queryParams}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.statusText}`);
  }

  return response.json();
};

export const getLocation = async (id: string): Promise<ApiResponse<Location>> => {
  const response = await apiFetch(getCfsUrl(`/v1/locations/${id}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch location: ${response.statusText}`);
  }

  return response.json();
};

export const createLocation = async (data: LocationCreateForm): Promise<ApiResponse<Location>> => {
  const response = await apiFetch(getCfsUrl('/v1/locations'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create location: ${response.statusText}`);
  }

  return response.json();
};

export const createLocationLayout = async (
  zoneId: string,
  data: LocationLayoutRequest,
): Promise<ApiResponse<LocationLayoutResponse>> => {
  const response = await apiFetch(getCfsUrl(`/v1/zones/${zoneId}/locations/layout`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create RBS layout: ${response.statusText}`);
  }

  return response.json();
};

export const updateLocation = async (id: string, data: LocationUpdateForm): Promise<ApiResponse<Location>> => {
  const response = await apiFetch(getCfsUrl(`/v1/locations/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update location: ${response.statusText}`);
  }

  return response.json();
};

export const updateLocationStatus = async (id: string, status: Location['status']): Promise<ApiResponse<Location>> => {
  const response = await apiFetch(getCfsUrl(`/v1/locations/${id}/status`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update location status: ${response.statusText}`);
  }

  return response.json();
};

export const deleteLocation = async (id: string): Promise<void> => {
  const response = await apiFetch(getCfsUrl(`/v1/locations/${id}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete location: ${response.statusText}`);
  }
};

// Zones and Locations API object for organized access
export const zonesLocationsApi = {
  zones: {
    getAll: getZones,
    getById: getZone,
    create: createZone,
    update: updateZone,
    updateStatus: updateZoneStatus,
    delete: deleteZone,
    getLocations: getZoneLocations,
  },
  locations: {
    getAll: getLocations,
    getById: getLocation,
    create: createLocation,
    createLayout: createLocationLayout,
    update: updateLocation,
    updateStatus: updateLocationStatus,
    delete: deleteLocation,
  },
};
