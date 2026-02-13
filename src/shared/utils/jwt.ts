/**
 * Lightweight helpers for decoding JSON Web Tokens (JWTs).
 * The functions favor resilience: any parsing failure yields `null` instead of throwing.
 */

type JwtPayload = Record<string, unknown>;

type GlobalWithBuffer = typeof globalThis & {
  Buffer?: {
    from(data: string, encoding: string): { toString(encoding: string): string };
  };
};

const decodeBase64 = (() => {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob.bind(globalThis) as (value: string) => string;
  }

  const buffer = (globalThis as GlobalWithBuffer).Buffer;
  if (buffer) {
    return (value: string) => buffer.from(value, 'base64').toString('binary');
  }

  return null;
})();

const decodeBase64Url = (segment: string): string | null => {
  if (!decodeBase64) {
    return null;
  }

  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = decodeBase64(padded);

    // Handle UTF-8 characters by decoding percent-encoded bytes
    const percentEncoded = decoded
      .split('')
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('');

    return decodeURIComponent(percentEncoded);
  } catch {
    return null;
  }
};

/**
 * Safely decodes the payload segment of a JWT.
 */
export const decodeJwt = <T extends JwtPayload = JwtPayload>(token: string): T | null => {
  if (typeof token !== 'string') {
    return null;
  }

  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  const payload = decodeBase64Url(segments[1]);
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
};

/**
 * Extracts the `exp` (expiration time) claim from a JWT, if present.
 * Returns the expiration timestamp in seconds since the Unix epoch.
 */
export const getJwtExp = (token: string): number | null => {
  const payload = decodeJwt(token);
  if (!payload) {
    return null;
  }

  const exp = payload.exp;

  if (typeof exp === 'number' && Number.isFinite(exp)) {
    return exp;
  }

  if (typeof exp === 'string') {
    const parsed = Number(exp);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

/**
 * Computes milliseconds remaining until token expiry, subtracting an optional skew.
 * Returns `null` when the token lacks a valid `exp` claim.
 */
export const getMsUntilExpiry = (token: string, skewMs = 10_000): number | null => {
  const exp = getJwtExp(token);
  if (exp === null) {
    return null;
  }

  const expiryMs = exp * 1000;
  const msRemaining = expiryMs - Date.now() - skewMs;

  return msRemaining > 0 ? msRemaining : 0;
};

export type { JwtPayload };
