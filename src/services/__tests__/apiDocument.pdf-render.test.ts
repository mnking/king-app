import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPdf } from '../apiDocument';
import { apiFetch } from '@/shared/utils/api-client';

vi.mock('@/shared/utils/api-client', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);

describe('documentApi.renderPdf', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('posts to pdf-render and returns a blob', async () => {
    const pdfBlob = new Blob(['pdf'], { type: 'application/pdf' });
    mockApiFetch.mockResolvedValue({
      ok: true,
      blob: async () => pdfBlob,
    } as any);

    await expect(
      renderPdf({
        templateCode: 'IMPORT_WAREHOUSE_RECEIVING_NOTE',
        payload: { foo: 'bar' },
      }),
    ).resolves.toBe(pdfBlob);

    const [url, options] = mockApiFetch.mock.calls[0] as [RequestInfo, RequestInit];
    expect(String(url)).toContain('/v1/pdf-render');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    );
    expect(JSON.parse(String(options?.body))).toEqual({
      templateCode: 'IMPORT_WAREHOUSE_RECEIVING_NOTE',
      payload: { foo: 'bar' },
    });
  });

  it('throws when backend responds with an error', async () => {
    const errorResponse = {
      ok: false,
      status: 400,
      clone: () => errorResponse,
      json: async () => ({ message: 'Bad request' }),
    } as any;

    mockApiFetch.mockResolvedValue(errorResponse);

    await expect(
      renderPdf({ templateCode: 'IMPORT_WAREHOUSE_RECEIVING_NOTE', payload: {} }),
    ).rejects.toThrow('Bad request');
  });
});
