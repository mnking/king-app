import { buildEndpointURL, env, isRealAPI } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import { documentConfig } from '@/features/document-service/config';
import { z } from 'zod';
import {
  ConfirmDocumentPayloadSchema,
  CreateDocumentPayloadSchema,
  CreateDocumentResponseSchema,
  DownloadDocumentResponseSchema,
  DocumentSchema,
  DocumentServiceErrorSchema,
  PaginatedDocumentsSchema,
  PaginationMetaSchema,
} from '@/features/document-service/types';
import type {
  ConfirmDocumentPayload,
  CreateDocumentPayload,
  CreateDocumentResponse,
  Document,
  DownloadDocumentResponse,
  PaginatedDocuments,
} from '@/features/document-service/types';

const SERVICE_KEY = 'document' as const;

const getDocumentUrl = (endpoint: string): string => {
  if (env.enableLogging) {
    console.log('[documentApi] building URL', {
      endpoint,
      viaRealApi: isRealAPI(SERVICE_KEY),
    });
  }

  if (isRealAPI(SERVICE_KEY)) {
    return buildEndpointURL(SERVICE_KEY, endpoint);
  }

  return `/api/document${endpoint}`;
};

const parseErrorResponse = async (response: Response): Promise<never> => {
  try {
    const data = await response.clone().json();
    const parsed = DocumentServiceErrorSchema.safeParse(data);
    if (parsed.success) {
      const message =
        typeof parsed.data.message === 'string'
          ? parsed.data.message
          : typeof parsed.data.error === 'string'
            ? parsed.data.error
            : `Document service request failed (${response.status}).`;
      throw new Error(message);
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : `Document service request failed (${response.status}).`;
    throw new Error(message);
  }

  throw new Error(`Document service request failed (${response.status}).`);
};

export interface ListDocumentsParams {
  ownerId: string;
  page?: number;
  itemsPerPage?: number;
  search?: string;
}

export const createDocument = async (
  payload: CreateDocumentPayload,
): Promise<CreateDocumentResponse> => {
  const body = CreateDocumentPayloadSchema.parse(payload);

  const response = await apiFetch(getDocumentUrl('/v1/documents'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return parseErrorResponse(response);
  }

  const json = await response.json();
  const parsed = CreateDocumentResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error(
      // TODO(i18n): Localize create document parse failure message.
      'Unexpected response when creating document. Please try again later.',
    );
  }

  return parsed.data;
};

export const confirmDocument = async (
  documentId: string,
  payload: ConfirmDocumentPayload = { status: 'UPLOADED' },
): Promise<Document> => {
  const body = ConfirmDocumentPayloadSchema.parse(payload);

  const response = await apiFetch(getDocumentUrl(`/v1/documents/${documentId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return parseErrorResponse(response);
  }

  const json = await response.json();
  const parsed = DocumentSchema.safeParse(json.data ?? json);

  if (!parsed.success) {
    throw new Error(
      // TODO(i18n): Localize confirm document parse failure message.
      'Unexpected response when confirming document upload.',
    );
  }

  return parsed.data;
};

const SimpleDocumentListSchema = z.object({
  results: DocumentSchema.array(),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive().optional(),
  itemsPerPage: z.number().int().positive().optional(),
});

const normalizePaginatedResponse = (data: any, params: ListDocumentsParams): PaginatedDocuments => {
  const candidates = [
    data,
    data?.data,
    data?.result,
    data?.payload,
    data?.response,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const directParse = PaginatedDocumentsSchema.safeParse(candidate);
    if (directParse.success) {
      return directParse.data;
    }

    const simpleParse = SimpleDocumentListSchema.safeParse(candidate);
    if (simpleParse.success) {
      const fallbackPage = params.page ?? 1;
      const fallbackItemsPerPage =
        params.itemsPerPage ?? documentConfig.defaultPageSize;
      const page = simpleParse.data.page ?? candidate?.page ?? fallbackPage;
      const itemsPerPage =
        simpleParse.data.itemsPerPage ?? candidate?.itemsPerPage ?? fallbackItemsPerPage;
      const numericItemsPerPage =
        typeof itemsPerPage === 'number' && itemsPerPage > 0
          ? itemsPerPage
          : fallbackItemsPerPage;
      const numericPage = typeof page === 'number' && page > 0 ? page : fallbackPage;
      const totalItems = simpleParse.data.total ?? simpleParse.data.results.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / numericItemsPerPage));

      return {
        items: simpleParse.data.results,
        meta: {
          page: numericPage,
          itemsPerPage: numericItemsPerPage,
          totalItems,
          totalPages,
        },
      };
    }

    const itemsCandidate =
      Array.isArray(candidate?.items) ? candidate.items : candidate?.data;
    const metaCandidate = candidate?.meta ?? candidate?.pagination;

    const itemsParse = DocumentSchema.array().safeParse(itemsCandidate);
    const metaParse = PaginationMetaSchema.safeParse(metaCandidate);

    if (itemsParse.success) {
      const fallbackPage = params.page ?? 1;
      const fallbackItemsPerPage =
        params.itemsPerPage ?? documentConfig.defaultPageSize;

      if (metaParse.success) {
        return {
          items: itemsParse.data,
          meta: metaParse.data,
        };
      }

      const candidatePage = typeof candidate?.page === 'number' ? candidate.page : undefined;
      const candidatePerPage =
        typeof candidate?.itemsPerPage === 'number' ? candidate.itemsPerPage : undefined;
      const candidateTotal =
        typeof candidate?.totalItems === 'number' ? candidate.totalItems : undefined;
      const candidateTotalPages =
        typeof candidate?.totalPages === 'number' ? candidate.totalPages : undefined;

      const numericItemsPerPage =
        candidatePerPage && candidatePerPage > 0
          ? candidatePerPage
          : fallbackItemsPerPage;
      const numericPage = candidatePage && candidatePage > 0 ? candidatePage : fallbackPage;
      const totalItems = candidateTotal ?? itemsParse.data.length;
      const totalPages =
        candidateTotalPages && candidateTotalPages > 0
          ? candidateTotalPages
          : Math.max(1, Math.ceil(totalItems / numericItemsPerPage));

      return {
        items: itemsParse.data,
        meta: {
          page: numericPage,
          itemsPerPage: numericItemsPerPage,
          totalItems,
          totalPages,
        },
      };
    }
  }

  throw new Error(
    // TODO(i18n): Localize document list parse failure.
    'Unexpected response when listing documents.',
  );
};

export const listDocuments = async (
  params: ListDocumentsParams,
): Promise<PaginatedDocuments> => {
  const query = new URLSearchParams();
  query.set('ownerId', params.ownerId);
  query.set('page', String(params.page ?? 1));
  query.set('itemsPerPage', String(params.itemsPerPage ?? documentConfig.defaultPageSize));
  if (params.search) {
    query.set('search', params.search);
  }

  const response = await apiFetch(getDocumentUrl(`/v1/documents?${query.toString()}`), {
    method: 'GET',
  });

  if (!response.ok) {
    return parseErrorResponse(response);
  }

  const json = await response.json();

  return normalizePaginatedResponse(json, params);
};

export const downloadDocument = async (
  documentId: string,
): Promise<DownloadDocumentResponse> => {
  const response = await apiFetch(
    getDocumentUrl(`/v1/documents/${documentId}/download`),
    {
      method: 'GET',
    },
  );

  if (!response.ok) {
    return parseErrorResponse(response);
  }

  const json = await response.json();
  const parsed = DownloadDocumentResponseSchema.safeParse(json.data ?? json);

  if (!parsed.success) {
    throw new Error(
      // TODO(i18n): Localize download response parse failure message.
      'Unexpected response when preparing document download.',
    );
  }

  return parsed.data;
};

export interface RenderPdfPayload {
  templateCode: string;
  payload: unknown;
}

export const renderPdf = async ({
  templateCode,
  payload,
}: RenderPdfPayload): Promise<Blob> => {
  const response = await apiFetch(getDocumentUrl('/v1/pdf-render'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ templateCode, payload }),
  });

  if (!response.ok) {
    return parseErrorResponse(response);
  }

  return response.blob();
};

export const documentApi = {
  createDocument,
  confirmDocument,
  listDocuments,
  downloadDocument,
  renderPdf,
};

export type DocumentApi = typeof documentApi;
