/**
 * Simplified API Configuration - KISS Principle
 *
 * Hardcoded routing decisions:
 * - Auth & CFS: Real API via Vite proxy (controlled by environment variables)
 * - All other features: MSW mocks
 */

// API paths - hardcoded decisions
export const API_ROUTES = {
  // Real APIs (proxied to cloud)
  auth: '/api/auth',
  cfs: '/api/cfs', // CFS (Container Freight Station) service - renamed from 'inventory'
  container: '/api/container', // container service (Containers and Container Types)
  forwarder: '/api/forwarder', // Forwarder service (Forwarders and House Bills)
  carrier: '/api/carrier', // Carrier service (Shipping Lines)
  document: '/api/document', // Document service (upload/list/download)
  billing: '/api/billing', // Billing service

  // MSW Mock APIs (no proxy needed)
  projects: '',
  tasks: '',
  users: '',
  teams: '',
  roles: '',
} as const;

// Service type definitions
export type APIService = keyof typeof API_ROUTES;

// Environment configuration
const toBool = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'boolean') return value;
  return fallback;
};

export const env = {
  // Defaults: enabled in dev, disabled in prod when unspecified
  enableMSW: toBool(import.meta.env.VITE_ENABLE_MSW, import.meta.env.DEV),
  enableLogging: toBool(import.meta.env.VITE_ENABLE_LOGGING, import.meta.env.DEV),
  useMockCfs: toBool(import.meta.env.VITE_USE_MOCK_CFS, import.meta.env.DEV), // Use MSW mocks for CFS service
  isDevelopment: import.meta.env.DEV,
} as const;

// Simple helper to check if service uses real API
export const isRealAPI = (_service: APIService): boolean => {
  return true; // All services use real API
};

// Get API path for a service
export const getAPIPath = (service: APIService): string => {
  return API_ROUTES[service];
};

// Build full URL for endpoints
export const buildEndpointURL = (service: APIService, endpoint: string): string => {
  if (!isRealAPI(service)) {
    return endpoint; // Return relative URL for MSW
  }

  const basePath = getAPIPath(service);
  const finalUrl = `${basePath}${endpoint}`; // relative (same-origin routing via proxy/ingress)
  
  // // Debug: log constructed URLs in test or dev to verify routing
  // if (import.meta.env.MODE === 'test' || import.meta.env.DEV) {
  //   // eslint-disable-next-line no-console
  //   console.log('[api] buildEndpointURL', { service, endpoint, finalUrl, origin: location.origin });
  // }
  return finalUrl;
};
