import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDocumentList } from '../use-document-list';
import { documentApi } from '@/services/apiDocument';

vi.mock('@/services/apiDocument', () => ({
  documentApi: {
    createDocument: vi.fn(),
    confirmDocument: vi.fn(),
    listDocuments: vi.fn(),
    downloadDocument: vi.fn(),
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

describe('useDocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches documents with default pagination', async () => {
    mockDocumentApi.listDocuments.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 1,
      },
    });

    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useDocumentList({
          ownerId: 'owner-1',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDocumentApi.listDocuments).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      page: 1,
      itemsPerPage: 10,
      search: undefined,
    });
  });

  it('updates page when setter is called', async () => {
    mockDocumentApi.listDocuments.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 5,
      },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDocumentList({
          ownerId: 'owner-1',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    mockDocumentApi.listDocuments.mockResolvedValue({
      items: [],
      meta: {
        page: 2,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 5,
      },
    });

    await act(async () => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(mockDocumentApi.listDocuments).toHaveBeenLastCalledWith({
        ownerId: 'owner-1',
        page: 2,
        itemsPerPage: 10,
        search: undefined,
      });
    });
  });
});
