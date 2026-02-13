import { z } from 'zod';

/**
 * Status string returned by the backend. Keep flexible for forward compatibility.
 */
export const DocumentStatusSchema = z.string().min(1);

const parseTags = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((tag) => (typeof tag === 'string' ? tag.trim() : String(tag).trim()))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeDateValue = (value: unknown): string | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // ignore parse issues and fall through
  }

  return String(value);
};

const normalizeSize = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 0 ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed >= 0 ? parsed : 0;
    }
  }

  return 0;
};

const RawDocumentSchema = z.object({
  id: z.string().optional(),
  documentId: z.string().optional(),
  ownerId: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  fileType: z.string().nullable().optional(),
  size: z.number().nonnegative().nullable().optional(),
  status: DocumentStatusSchema,
  scope: z.string().nullable().optional(),
  tags: z.union([z.string(), z.array(z.string())]).nullish(),
  createdAt: z.union([z.string(), z.date()]),
  createdBy: z.string().nullable().optional(),
  updatedAt: z.union([z.string(), z.date()]).nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullish(),
  bucket: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  sourceSystemReference: z.string().nullable().optional(),
  actions: z.record(z.unknown()).nullish(),
});

export const DocumentSchema = RawDocumentSchema.transform((raw) => {
  const id = raw.documentId ?? raw.id;
  if (!id) {
    throw new Error('Document response missing identifier');
  }

  return {
    id,
    ownerId: raw.ownerId ?? '',
    name: raw.name,
    description: raw.description ?? null,
    fileType: raw.fileType ?? null,
    size: normalizeSize(raw.size),
    status: raw.status,
    scope: raw.scope ?? null,
    tags: parseTags(raw.tags),
    createdAt: normalizeDateValue(raw.createdAt) ?? '',
    createdBy: raw.createdBy ?? null,
    updatedAt: normalizeDateValue(raw.updatedAt),
    updatedBy: raw.updatedBy ?? null,
    metadata: raw.metadata ?? undefined,
    bucket: raw.bucket ?? null,
    key: raw.key ?? null,
    sourceId: raw.sourceId ?? null,
    sourceSystemReference: raw.sourceSystemReference ?? null,
    actions: raw.actions ?? undefined,
  } satisfies Document;
});

export interface Document {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  fileType: string | null;
  size: number;
  status: string;
  scope: string | null;
  tags: string[];
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  metadata?: Record<string, unknown>;
  bucket: string | null;
  key: string | null;
  sourceId: string | null;
  sourceSystemReference: string | null;
  actions?: Record<string, unknown> | null;
}

export const PaginationMetaSchema = z.object({
  page: z.number().int().nonnegative(),
  itemsPerPage: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const PaginatedDocumentsSchema = z.object({
  items: z.array(DocumentSchema),
  meta: PaginationMetaSchema,
});

export type PaginatedDocuments = z.infer<typeof PaginatedDocumentsSchema>;

export const CreateDocumentPayloadSchema = z.object({
  ownerId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  fileType: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().min(1))
    .optional(),
  scope: z.string().optional(),
  tags: z
    .union([
      z.string(),
      z.array(z.string()),
    ])
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      return Array.isArray(value) ? value : value.split(',').map((tag) => tag.trim());
    }),
  size: z.number().int().nonnegative(),
  checksum: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateDocumentPayload = z.infer<typeof CreateDocumentPayloadSchema>;

export const CreateDocumentResponseSchema = z.object({
  documentId: z.string(),
  uploadUrl: z.string().url(),
  requiredHeaders: z.record(z.string()).optional(),
  maxSize: z.number().int().positive().optional(),
  allowedMime: z.array(z.string()).optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
  objectKey: z.string().optional(),
});

export type CreateDocumentResponse = z.infer<typeof CreateDocumentResponseSchema>;

export const ConfirmDocumentPayloadSchema = z.object({
  status: z.literal('UPLOADED'),
});

export type ConfirmDocumentPayload = z.infer<typeof ConfirmDocumentPayloadSchema>;

export const DownloadDocumentResponseSchema = z.object({
  downloadUrl: z.string().url(),
  expiresIn: z.number().int().positive().optional(),
});

export type DownloadDocumentResponse = z.infer<typeof DownloadDocumentResponseSchema>;

/**
 * Backend may return additional error detail fields. Capture the most common shape.
 */
export const DocumentServiceErrorSchema = z
  .object({
    message: z.string().optional(),
    error: z.union([z.string(), z.record(z.unknown())]).optional(),
    statusCode: z.number().optional(),
    details: z.union([z.string(), z.record(z.unknown()), z.array(z.unknown())]).optional(),
  })
  .passthrough();

export type DocumentServiceError = z.infer<typeof DocumentServiceErrorSchema>;
