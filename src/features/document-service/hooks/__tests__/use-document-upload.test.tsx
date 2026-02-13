import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDocumentUpload } from '../use-document-upload';
import { documentApi } from '@/services/apiDocument';
import { uploadFileWithProgress } from '../../helpers/upload';

vi.mock('@/services/apiDocument', () => ({
  documentApi: {
    createDocument: vi.fn(),
    confirmDocument: vi.fn(),
    listDocuments: vi.fn(),
    downloadDocument: vi.fn(),
  },
}));

vi.mock('../../helpers/upload', () => ({
  uploadFileWithProgress: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient();
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
};

const mockDocumentApi = vi.mocked(documentApi);
const mockUploadFileWithProgress = vi.mocked(uploadFileWithProgress);

describe('useDocumentUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads and confirms a document successfully', async () => {
    const file = new File(['hello'], 'test.pdf', { type: 'application/pdf' });

    mockDocumentApi.createDocument.mockResolvedValue({
      documentId: 'doc-123',
      uploadUrl: 'https://s3/upload',
      requiredHeaders: { 'Content-Type': 'application/pdf' },
      allowedMimeTypes: ['application/pdf'],
      maxSize: file.size * 2,
    } as any);

    mockUploadFileWithProgress.mockResolvedValue();

    mockDocumentApi.confirmDocument.mockResolvedValue({
      id: 'doc-123',
      ownerId: 'owner-1',
      name: 'test.pdf',
      size: file.size,
      status: 'UPLOADED',
      createdAt: new Date().toISOString(),
    } as any);

    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useDocumentUpload({
          ownerId: 'owner-1',
        }),
      { wrapper },
    );

    await act(async () => {
      result.current.upload(file);
    });

    await waitFor(() => {
      expect(mockDocumentApi.confirmDocument).toHaveBeenCalledWith('doc-123', {
        status: 'UPLOADED',
      });
      expect(mockDocumentApi.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          fileType: 'pdf',
        }),
      );
      expect(result.current.status).toBe('success');
      expect(result.current.progress).toBe(100);
    });
  });

  it('maps 403 upload errors to localized retry message', async () => {
    const file = new File(['hello'], 'test.pdf', { type: 'application/pdf' });

    mockDocumentApi.createDocument.mockResolvedValue({
      documentId: 'doc-123',
      uploadUrl: 'https://s3/upload',
      requiredHeaders: {},
      allowedMimeTypes: ['application/pdf'],
      maxSize: file.size * 2,
    } as any);

    const forbiddenError = new Error('Forbidden');
    (forbiddenError as any).status = 403;
    mockUploadFileWithProgress.mockRejectedValue(forbiddenError);

    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useDocumentUpload({
          ownerId: 'owner-1',
        }),
      { wrapper },
    );

    await act(async () => {
      result.current.upload(file);
    });

    await waitFor(() => {
      expect(mockDocumentApi.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          fileType: 'pdf',
        }),
      );
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toContain('Link hết hạn');
    });
  });
});
