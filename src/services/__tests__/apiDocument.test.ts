import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listDocuments, downloadDocument } from '../apiDocument';
import { apiFetch } from '@/shared/utils/api-client';

vi.mock('@/shared/utils/api-client', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);

describe('documentApi.listDocuments', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('normalizes PaginationResponse shape from backend', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            documentId: 'doc-123',
            ownerId: 'owner-1',
            name: 'Invoice',
            description: null,
            fileType: 'pdf',
            size: null,
            status: 'UPLOADED',
            tags: 'finance,invoice',
            createdAt: '2025-11-03T03:00:00.000Z',
            createdBy: 'tester',
            updatedAt: null,
            updatedBy: null,
          },
        ],
        total: 1,
      }),
    } as any);

    const result = await listDocuments({
      ownerId: 'owner-1',
      page: 1,
      itemsPerPage: 10,
    });

    expect(result.meta).toEqual({
      page: 1,
      itemsPerPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    expect(result.items[0]).toMatchObject({
      id: 'doc-123',
      ownerId: 'owner-1',
      name: 'Invoice',
      fileType: 'pdf',
      size: 0,
      status: 'UPLOADED',
      tags: ['finance', 'invoice'],
      createdAt: '2025-11-03T03:00:00.000Z',
      createdBy: 'tester',
    });
  });
});

describe('documentApi.downloadDocument', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('returns download URL from backend payload', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        downloadUrl: 'https://files.example.com/doc.pdf',
        expiresIn: 3600,
      }),
    } as any);

    const result = await downloadDocument('doc-123');

    expect(result).toEqual({
      downloadUrl: 'https://files.example.com/doc.pdf',
      expiresIn: 3600,
    });
  });
});
