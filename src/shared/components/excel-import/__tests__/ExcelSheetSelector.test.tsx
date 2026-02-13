import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExcelSheetSelector } from '../ExcelSheetSelector';

describe('ExcelSheetSelector', () => {
  it('renders options and calls onChange', () => {
    const onChange = vi.fn();
    render(
      <ExcelSheetSelector sheetNames={['Sheet1', 'Sheet2']} value={'Sheet1'} onChange={onChange} />,
    );

    expect(screen.getByLabelText(/sheet/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/sheet/i), {
      target: { value: 'Sheet2' },
    });

    expect(onChange).toHaveBeenCalledWith('Sheet2');
  });
});
