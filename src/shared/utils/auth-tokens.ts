import { getJwtExp } from './jwt';

const REFRESH_TOKEN_KEY = 'auth.refresh_token';

let accessToken: string | null = null;
let accessTokenExpiresAt: number | null = null;

const isBrowser = typeof window !== 'undefined';

const encode = (value: string) => {
  if (!isBrowser) {
    return value;
  }

  try {
    return window.btoa(value);
  } catch (error) {
    console.warn('Failed to encode refresh token', error);
    return value;
  }
};

const decode = (value: string | null) => {
  if (!isBrowser || !value) {
    return value;
  }

  try {
    return window.atob(value);
  } catch (error) {
    console.warn('Failed to decode refresh token', error);
    return null;
  }
};

export const getAccessToken = () => accessToken;

export const getAccessTokenExpiry = () => accessTokenExpiresAt;

export const setAccessToken = (token: string | null, expiresAt?: number | null) => {
  accessToken = token;
  accessTokenExpiresAt = typeof expiresAt === 'number' ? expiresAt : null;
};

export const setRefreshToken = (token: string | null) => {
  if (!isBrowser) {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }

  // Store the new refresh token (replaces old one for rotation support)
  // The JWT itself contains the expiry time in its 'exp' claim
  window.localStorage.setItem(REFRESH_TOKEN_KEY, encode(token));
};

export const isRefreshTokenExpired = (): boolean => {
  if (!isBrowser) {
    return false;
  }

  const encodedToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!encodedToken) {
    return false;
  }

  const token = decode(encodedToken);
  if (!token) {
    return false;
  }

  // Extract expiry from JWT's exp claim (in seconds)
  const expSeconds = getJwtExp(token);
  if (!expSeconds) {
    // No exp claim = assume valid (backwards compatible)
    return false;
  }

  // Convert to milliseconds and check if expired
  return Date.now() > (expSeconds * 1000);
};

export const getRefreshToken = (): string | null => {
  if (!isBrowser) {
    return null;
  }

  // Check if refresh token is expired before returning
  if (isRefreshTokenExpired()) {
    // Clean up expired tokens
    clearTokenStorage();
    return null;
  }

  const stored = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  return decode(stored);
};

export const clearTokenStorage = () => {
  setAccessToken(null);
  if (isBrowser) {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};
