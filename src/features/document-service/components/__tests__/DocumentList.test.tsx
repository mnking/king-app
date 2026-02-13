import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentList from '../DocumentList';
import { useDocumentList } from '../../hooks/use-document-list';
import { useDocumentDownload } from '../../hooks/use-document-download';

vi.mock('../../hooks/use-document-list', () => ({
  useDocumentList: vi.fn(),
}));

vi.mock('../../hooks/use-document-download', () => ({
  useDocumentDownload: vi.fn(),
}));

const mockUseDocumentList = vi.mocked(useDocumentList);
const mockUseDocumentDownload = vi.mocked(useDocumentDownload);

describe('DocumentList', () => {
  beforeEach(() => {
    mockUseDocumentList.mockReturnValue({
      data: {
        items: [
          {
            id: 'doc-1',
            ownerId: 'owner-1',
            name: 'invoice.pdf',
            fileType: 'application/pdf',
            size: 1024,
            status: 'UPLOADED',
            createdAt: new Date().toISOString(),
            createdBy: 'tester',
          },
        ],
        meta: { page: 1, itemsPerPage: 10, totalItems: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      itemsPerPage: 10,
      setItemsPerPage: vi.fn(),
      queryKey: ['document-service', 'documents', 'owner-1', 1, 10, undefined],
    } as any);

    mockUseDocumentDownload.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    } as any);
  });

  it('renders document rows and handles download click', () => {
    const downloadSpy = vi.fn();
    mockUseDocumentDownload.mockReturnValue({
      mutate: downloadSpy,
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    } as any);

    render(<DocumentList ownerId="owner-1" />);

    expect(screen.getByText(/invoice\.pdf/i)).toBeInTheDocument();

    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);

    expect(downloadSpy).toHaveBeenCalledWith({
      documentId: 'doc-1',
      fileName: 'invoice.pdf',
    });
  });

  it('disables download button when status is not UPLOADED', () => {
    mockUseDocumentList.mockReturnValue({
      data: {
        items: [
          {
            id: 'doc-2',
            ownerId: 'owner-1',
            name: 'pending.pdf',
            fileType: 'application/pdf',
            size: 1024,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            createdBy: 'tester',
          },
        ],
        meta: { page: 1, itemsPerPage: 10, totalItems: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      itemsPerPage: 10,
      setItemsPerPage: vi.fn(),
      queryKey: ['document-service', 'documents', 'owner-1', 1, 10, undefined],
    } as any);

    mockUseDocumentDownload.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      variables: undefined,
    } as any);

    render(<DocumentList ownerId="owner-1" />);

    const downloadButton = screen.getByRole('button', { name: /download/i });
    expect(downloadButton).toBeDisabled();
  });
});
