import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDocumentDownload } from '../use-document-download';
import { documentApi } from '@/services/apiDocument';

vi.mock('@/services/apiDocument', () => ({
  documentApi: {
    downloadDocument: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockDocumentApi = vi.mocked(documentApi);

describe('useDocumentDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers browser download with returned URL', async () => {
    mockDocumentApi.downloadDocument.mockResolvedValue({
      downloadUrl: 'https://files.example.com/doc.pdf',
      expiresIn: 3600,
    } as any);

    const clickSpy = vi.fn();
    const realAnchor = document.createElement('a');
    vi.spyOn(realAnchor, 'click').mockImplementation(clickSpy);

    const originalCreateElement = document.createElement;
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === 'a') {
          return realAnchor;
        }
        return originalCreateElement.call(document, tagName);
      });

    const queryClient = new QueryClient();
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDocumentDownload(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        documentId: 'doc-123',
        fileName: 'doc.pdf',
      });
    });

    expect(mockDocumentApi.downloadDocument).toHaveBeenCalledWith('doc-123');
    expect(clickSpy).toHaveBeenCalledTimes(1);

    createElementSpy.mockRestore();
  });
});
