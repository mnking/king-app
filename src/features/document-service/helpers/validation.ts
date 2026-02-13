import { documentConfig } from '../config';

const MB_IN_BYTES = 1024 * 1024;

export interface BackendConstraints {
  maxSize?: number | null;
  allowedMime?: string[] | null;
  allowedMimeTypes?: string[] | null;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  effectiveMaxSize: number;
  allowedMimeTypes: string[];
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
};

const resolveAllowedMimeTypes = (constraints?: BackendConstraints): string[] => {
  const backendList =
    constraints?.allowedMimeTypes ?? constraints?.allowedMime ?? undefined;

  if (backendList && backendList.length > 0) {
    return backendList;
  }

  return documentConfig.allowedMimeTypes;
};

const resolveMaxSizeBytes = (constraints?: BackendConstraints): number => {
  const configLimit = documentConfig.maxFileSizeMb * MB_IN_BYTES;
  if (!constraints?.maxSize) {
    return configLimit;
  }

  return Math.min(configLimit, constraints.maxSize);
};

const normalizeFileExtension = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed || undefined;
};

/**
 * Derive the backend-friendly file extension from a `File` object.
 * Prefers the name suffix and falls back to MIME subtype when name is unavailable.
 */
export const inferFileExtension = (file: File | null): string | undefined => {
  if (!file) return undefined;

  const nameParts = file.name?.split('.') ?? [];
  if (nameParts.length > 1) {
    const extension = nameParts[nameParts.length - 1];
    const normalized = normalizeFileExtension(extension);
    if (normalized) return normalized;
  }

  if (file.type?.includes('/')) {
    const mimeParts = file.type.split('/');
    const subtype = mimeParts[mimeParts.length - 1];
    const normalized = normalizeFileExtension(subtype);
    if (normalized) return normalized;
  }

  return undefined;
};

/**
 * Validate file against configured and backend supplied constraints.
 */
export const validateFile = (
  file: File | null,
  constraints?: BackendConstraints,
): FileValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!file) {
    return {
      isValid: false,
      errors: [
        // TODO(i18n): Localize empty file validation message.
        'Please select a file before uploading.',
      ],
      warnings,
      effectiveMaxSize: resolveMaxSizeBytes(constraints),
      allowedMimeTypes: resolveAllowedMimeTypes(constraints),
    };
  }

  const effectiveMaxSize = resolveMaxSizeBytes(constraints);
  if (file.size > effectiveMaxSize) {
    errors.push(
      // TODO(i18n): Localize file too large validation message.
      `File is too large. Max size is ${formatBytes(effectiveMaxSize)}.`,
    );
  }

  const allowedMimeTypes = resolveAllowedMimeTypes(constraints);
  if (allowedMimeTypes.length > 0 && file.type) {
    const isAllowed = allowedMimeTypes.some((mime) => mime === file.type);
    if (!isAllowed) {
      errors.push(
        // TODO(i18n): Localize unsupported file type validation message.
        `Unsupported file type. Allowed: ${allowedMimeTypes.join(', ')}`,
      );
    }
  } else if (allowedMimeTypes.length > 0 && !file.type) {
    warnings.push(
      // TODO(i18n): Localize missing MIME warning.
      'File type could not be detected. Upload may fail if the service enforces MIME validation.',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    effectiveMaxSize,
    allowedMimeTypes,
  };
};

export { formatBytes };
