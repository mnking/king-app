import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentUploader } from '../DocumentUploader';
import { useDocumentUpload } from '../../hooks/use-document-upload';

vi.mock('../../hooks/use-document-upload', () => ({
  useDocumentUpload: vi.fn(),
}));

const mockUseDocumentUpload = vi.mocked(useDocumentUpload);

describe('DocumentUploader', () => {
  beforeEach(() => {
    mockUseDocumentUpload.mockReturnValue({
      upload: vi.fn(),
      cancel: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      progress: 0,
      error: null,
      isUploading: false,
      canRetry: false,
    } as any);
  });

  it('triggers upload when file is selected and button clicked', () => {
    const uploadSpy = vi.fn();
    mockUseDocumentUpload.mockReturnValue({
      upload: uploadSpy,
      cancel: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      progress: 0,
      error: null,
      isUploading: false,
      canRetry: false,
    } as any);

    render(<DocumentUploader ownerId="owner-1" />);

    const input = screen.getByLabelText(/select document/i) as HTMLInputElement;
    const file = new File(['content'], 'demo.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);

    expect(uploadSpy).toHaveBeenCalledWith(file);
  });
});
