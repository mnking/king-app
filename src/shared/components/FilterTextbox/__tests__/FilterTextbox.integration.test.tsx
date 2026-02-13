/**
 * FilterTextbox Integration Tests
 *
 * Component-level integration tests verifying FilterTextbox behavior
 * in controlled/uncontrolled modes with search triggers and callbacks.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterTextbox } from '../FilterTextbox';

describe('FilterTextbox Integration Tests', () => {
  describe('Manual Trigger Behavior', () => {
    it('should not filter automatically on typing', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber', 'agentCode'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025-001');

      // Verify typing does not trigger search
      expect(onSearch).not.toHaveBeenCalled();
      expect(input).toHaveValue('BO-2025-001');
    });

    it('should trigger filter on search icon click', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber', 'agentCode'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify manual trigger works
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('BO-2025', fields);
    });

    it('should trigger filter on Enter key press', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test{Enter}');

      // Verify Enter key triggers search
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('test', fields);
    });
  });

  describe('Helper Text and Active State', () => {
    it('should show helper text when filter is active', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify active state helper text appears
      await waitFor(() => {
        expect(screen.getByText(/filter.*active/i)).toBeInTheDocument();
      });
    });

    it('should remove helper text after clearing', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const onClear = vi.fn();
      const fields = ['bookingNumber'];

      render(
        <FilterTextbox fields={fields} onSearch={onSearch} onClear={onClear} />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/filter.*active/i)).toBeInTheDocument();
      });

      // Clear and verify helper text is removed
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText(/filter.*active/i)).not.toBeInTheDocument();
      });
    });

    it('should maintain helper text on repeated searches', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });

      // First search
      await user.click(searchButton);
      await waitFor(() => {
        expect(screen.getByText(/filter.*active/i)).toBeInTheDocument();
      });

      // Second search with same value
      await user.click(searchButton);

      // Helper text should still be visible
      expect(screen.getByText(/filter.*active/i)).toBeInTheDocument();
      expect(onSearch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Clear Control', () => {
    it('should clear input and reset dataset on clear action', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const onClear = vi.fn();
      const fields = ['bookingNumber'];

      render(
        <FilterTextbox fields={fields} onSearch={onSearch} onClear={onClear} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // Verify clear action
      expect(input.value).toBe('');
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('should persist clear control when active', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify clear button persists after search
      expect(
        screen.getByRole('button', { name: /clear/i })
      ).toBeInTheDocument();
    });
  });

  describe('Multi-Field Support (US2 - Future)', () => {
    it.todo('should handle multiple field arrays');
    it.todo('should split space-separated keywords');
    it.todo('should clear all fields on reset');
  });

  describe('Custom Transform Support (US3 - Future)', () => {
    it.todo('should apply custom transform before sanitization');
    it.todo('should skip sanitization when flag is set');
    it.todo('should update aria-label dynamically');
  });

  describe('Integration with Parent Components', () => {
    it('should work with controlled state from parent', async () => {
      const user = userEvent.setup();
      const ParentComponent = () => {
        const [searchTerm, setSearchTerm] = React.useState('');
        const [results, setResults] = React.useState<string[]>([]);

        const handleSearch = (term: string) => {
          // Simulate filtering logic
          setResults(term ? [`Result for: ${term}`] : []);
        };

        return (
          <div>
            <FilterTextbox
              fields={['test']}
              value={searchTerm}
              onInputChange={setSearchTerm}
              onSearch={handleSearch}
            />
            <div data-testid="results">
              {results.map((result, i) => (
                <div key={i}>{result}</div>
              ))}
            </div>
          </div>
        );
      };

      render(<ParentComponent />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify parent receives callbacks and updates state
      await waitFor(() => {
        expect(screen.getByTestId('results')).toHaveTextContent(
          'Result for: test'
        );
      });
    });
  });
});
