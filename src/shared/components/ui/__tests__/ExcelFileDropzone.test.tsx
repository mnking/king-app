import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExcelFileDropzone } from '../ExcelFileDropzone';

describe('ExcelFileDropzone', () => {
  it('renders upload text', () => {
    render(
      <ExcelFileDropzone
        onFileSelect={vi.fn()}
        allowedExtensions={['.xlsx']}
        maxFileSizeMb={10}
      />,
    );

    expect(screen.getByText(/drop file here/i)).toBeInTheDocument();
  });

  it('calls onFileSelect when file is selected', () => {
    const onFileSelect = vi.fn();
    render(
      <ExcelFileDropzone
        onFileSelect={onFileSelect}
        allowedExtensions={['.xlsx']}
        maxFileSizeMb={10}
      />,
    );

    const input = screen.getByLabelText(/select excel file/i);
    const file = new File(['x'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });
});
