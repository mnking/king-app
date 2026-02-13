const coerceNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const coerceMimeList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const defaultMaxFileSizeMb = 25;
const defaultAllowedMime = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/x-rar-compressed',
  'application/zip',
];
const defaultPageSize = 10;

/**
 * Document service configuration derived from environment variables.
 * Falling back to safe defaults keeps local development unblocked.
 */
export const documentConfig = {
  apiBaseUrl:
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    (import.meta.env.API_BASE_URL as string | undefined) ??
    '',
  maxFileSizeMb: coerceNumber(
    (import.meta.env.VITE_MAX_FILE_SIZE_MB as string | undefined) ??
      (import.meta.env.MAX_FILE_SIZE_MB as string | undefined),
    defaultMaxFileSizeMb,
  ),
  allowedMimeTypes: coerceMimeList(
    (import.meta.env.VITE_ALLOWED_MIME as string | undefined) ??
      (import.meta.env.ALLOWED_MIME as string | undefined),
    defaultAllowedMime,
  ),
  defaultPageSize: coerceNumber(
    (import.meta.env.VITE_DEFAULT_PAGE_SIZE as string | undefined) ??
      (import.meta.env.DEFAULT_PAGE_SIZE as string | undefined),
    defaultPageSize,
  ),
} as const;

export type DocumentConfig = typeof documentConfig;
