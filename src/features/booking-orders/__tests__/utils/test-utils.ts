/**
 * Integration Test Utilities for Booking Orders
 *
 * Provides authentication, data setup, and cleanup functions
 * for integration tests against real API (http://localhost:8000)
 */

const API_BASE = 'http://localhost:8000';

// ===========================
// Authentication
// ===========================

export interface AuthToken {
  token: string;
  expiresAt?: string;
}

/**
 * Login and get access token for API requests
 */
export async function loginAndGetToken(
  username = 'admin',
  password = 'admin'
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Auth failed [${response.status}]: ${text || response.statusText}`);
  }

  const data = await response.json();
  const token = data.access_token || data.token || data.accessToken;

  if (!token) {
    throw new Error('Auth success but no access_token in response');
  }

  return token;
}

// ===========================
// Container Number Generation (ISO 6346)
// ===========================

const OWNERS = ['MSCU', 'TEMU', 'CMAU', 'HLBU', 'MAEU', 'ONEU', 'APZU', 'EGLV'];

const ISO6346_LETTER_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

function iso6346CheckDigit(ownerEquip: string, serial: string): number {
  const s = ownerEquip + serial;
  let sum = 0;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    let val: number;

    if (ch >= 'A' && ch <= 'Z') {
      val = ISO6346_LETTER_VALUES[ch];
      if (typeof val !== 'number') {
        throw new Error(`Invalid ISO6346 character: ${ch}`);
      }
    } else {
      val = parseInt(ch, 10);
      if (Number.isNaN(val)) {
        throw new Error(`Invalid numeric character in serial: ${ch}`);
      }
    }

    sum += val * (2 ** i);
  }

  const remainder = sum % 11;
  return remainder % 10;
}

/**
 * Generate a valid ISO 6346 container number
 */
export function generateContainerNumber(): string {
  const owner = OWNERS[Math.floor(Math.random() * OWNERS.length)];
  const serial = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  const checkDigit = iso6346CheckDigit(owner, serial);
  return `${owner}${serial}${checkDigit}`;
}

// ===========================
// Seal Number Generation
// ===========================

/**
 * Generate a unique seal number
 */
export function generateSealNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SEAL${timestamp}${random}`;
}

// ===========================
// Date Helpers
// ===========================

/**
 * Get ISO date string for today
 */
export function getTodayISO(): string {
  return new Date().toISOString();
}

/**
 * Get ISO date string for future date (days from now)
 */
export function getFutureDateISO(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

// ===========================
// Random Data Helpers
// ===========================

/**
 * Generate random alphanumeric string
 */
export function randomAlphaNum(length = 4): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Pick random item from array
 */
export function pick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// ===========================
// API Request Helpers
// ===========================

export interface ApiRequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  token: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed [${response.status}]: ${text}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ===========================
// Cleanup Helpers
// ===========================

export interface TestResourceTracker {
  bookingOrderIds: string[];
  forwarderIds: string[];
  containerIds: string[];
  hblIds: string[];
}

/**
 * Create a resource tracker for cleanup
 */
export function createResourceTracker(): TestResourceTracker {
  return {
    bookingOrderIds: [],
    forwarderIds: [],
    containerIds: [],
    hblIds: [],
  };
}

/**
 * Cleanup all tracked resources
 */
export async function cleanupResources(
  token: string,
  tracker: TestResourceTracker
): Promise<void> {
  // Guard against early failures (e.g., when beforeAll fails to get token)
  if (!token || !tracker) {
    console.warn('Skipping cleanup: missing token or tracker (test setup may have failed)');
    return;
  }

  const errors: string[] = [];

  // Delete booking orders first (they reference other entities)
  for (const id of tracker.bookingOrderIds) {
    try {
      await apiRequest(`/api/cfs/v1/booking-orders/${id}`, token, {
        method: 'DELETE',
      });
    } catch (error) {
      errors.push(`Failed to delete booking order ${id}: ${error}`);
    }
  }

  // Delete HBLs (skip 409 for approved HBLs - they can't be deleted)
  for (const id of tracker.hblIds) {
    try {
      await apiRequest(`/api/forwarder/v1/hbls/${id}`, token, {
        method: 'DELETE',
      });
    } catch (error) {
      const errorStr = String(error);
      // Skip 409 errors for approved HBLs (expected behavior)
      if (!errorStr.includes('409') && !errorStr.includes('cannot be deleted')) {
        errors.push(`Failed to delete HBL ${id}: ${error}`);
      }
    }
  }

  // Delete containers
  for (const id of tracker.containerIds) {
    try {
      await apiRequest(`/api/container/v1/containers/${id}`, token, {
        method: 'DELETE',
      });
    } catch (error) {
      errors.push(`Failed to delete container ${id}: ${error}`);
    }
  }

  // Delete forwarders
  for (const id of tracker.forwarderIds) {
    try {
      await apiRequest(`/api/forwarder/v1/forwarders/${id}`, token, {
        method: 'DELETE',
      });
    } catch (error) {
      errors.push(`Failed to delete forwarder ${id}: ${error}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Cleanup errors:', errors.join('\n'));
  }
}
