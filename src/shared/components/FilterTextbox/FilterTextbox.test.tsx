/**
 * FilterTextbox Unit Tests (User Story 1)
 *
 * Tests for manual-trigger filtering, active-state feedback,
 * helper text, and clear control behavior.
 *
 * Following TDD: These tests written BEFORE implementation (T010-T013)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterTextbox } from './FilterTextbox';

describe('FilterTextbox - User Story 1: Basic Filter Interaction', () => {
  describe('Manual Trigger Behavior', () => {
    it('should not call onSearch when typing (no auto-filter)', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber', 'agentCode'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      // onSearch should NOT be called while typing
      expect(onSearch).not.toHaveBeenCalled();
    });

    it('should trigger onSearch when search icon is clicked', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber', 'agentCode'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // onSearch should be called with search term and fields
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('BO-2025', fields);
    });

    it('should trigger onSearch when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025{Enter}');

      // onSearch should be called when Enter is pressed
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('BO-2025', fields);
    });

    it('should allow repeated search icon clicks with same value', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });

      // Click search multiple times
      await user.click(searchButton);
      await user.click(searchButton);
      await user.click(searchButton);

      // onSearch should be called each time
      expect(onSearch).toHaveBeenCalledTimes(3);
    });

    it('should trigger onSearch with empty string when input is empty (search all)', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Empty search = "search all" - should call with empty string
      expect(onSearch).toHaveBeenCalledWith('', fields);
    });

    it('should trigger onSearch with empty string when input is only whitespace', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '   ');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Whitespace-only = empty search = "search all"
      expect(onSearch).toHaveBeenCalledWith('', fields);
    });
  });

  describe('Active State (Background Highlight)', () => {
    it('should highlight input background when filter is active', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Input should have active-state background class
      await waitFor(() => {
        expect(input).toHaveClass(/bg-blue-50|dark:bg-blue-900/);
      });
    });

    it('should remove background highlight after clearing', async () => {
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

      // Should have blue background
      await waitFor(() => {
        expect(input).toHaveClass(/bg-blue-50|dark:bg-blue-900/);
      });

      // Clear the input
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // Background should be removed
      await waitFor(() => {
        expect(input).not.toHaveClass(/bg-blue-50|dark:bg-blue-900/);
      });
    });
  });

  describe('Clear Control', () => {
    it('should show clear button when input has value', async () => {
      const user = userEvent.setup();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} />);

      // Initially no clear button
      expect(
        screen.queryByRole('button', { name: /clear/i })
      ).not.toBeInTheDocument();

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      // Clear button should appear
      expect(
        screen.getByRole('button', { name: /clear/i })
      ).toBeInTheDocument();
    });

    it('should clear input value when clear button is clicked', async () => {
      const user = userEvent.setup();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'BO-2025');

      expect(input.value).toBe('BO-2025');

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // Input should be cleared
      expect(input.value).toBe('');
    });

    it('should call onClear callback when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onClear = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onClear={onClear} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // onClear should be called
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('should hide clear button after clearing', async () => {
      const user = userEvent.setup();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // Clear button should be hidden
      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /clear/i })
        ).not.toBeInTheDocument();
      });
    });

    it('should persist clear control when filter is active', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Clear button should still be visible after search
      expect(
        screen.getByRole('button', { name: /clear/i })
      ).toBeInTheDocument();
    });
  });

  describe('Controlled vs Uncontrolled Mode', () => {
    it('should work in controlled mode with value prop', async () => {
      const user = userEvent.setup();
      const onInputChange = vi.fn();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      const { rerender } = render(
        <FilterTextbox
          fields={fields}
          value=""
          onInputChange={onInputChange}
          onSearch={onSearch}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'B');

      // onInputChange should be called
      expect(onInputChange).toHaveBeenCalledWith('B');

      // Simulate parent updating value
      rerender(
        <FilterTextbox
          fields={fields}
          value="B"
          onInputChange={onInputChange}
          onSearch={onSearch}
        />
      );

      expect(input.value).toBe('B');
    });

    it('should work in uncontrolled mode with defaultValue', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(
        <FilterTextbox
          fields={fields}
          defaultValue="BO-2025"
          onSearch={onSearch}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('BO-2025');

      await user.type(input, '-001');
      expect(input.value).toBe('BO-2025-001');
    });
  });

  describe('Empty Fields Disabled State', () => {
    it('should disable input when fields array is empty', () => {
      render(<FilterTextbox fields={[]} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should disable search button when fields array is empty', () => {
      render(<FilterTextbox fields={[]} />);

      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeDisabled();
    });

    it('should show helper text when fields array is empty', () => {
      render(<FilterTextbox fields={[]} />);

      // TODO(i18n): Replace with translation key
      expect(
        screen.getByText(/no.*field.*configured/i)
      ).toBeInTheDocument();
    });

    it('should not disable when fields array has items', async () => {
      const user = userEvent.setup();
      render(<FilterTextbox fields={['bookingNumber']} />);

      const input = screen.getByRole('textbox');
      expect(input).not.toBeDisabled();

      // Search button should always be enabled (not disabled by empty input)
      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).not.toBeDisabled();

      // After typing, search button should still be enabled
      await user.type(input, 'test');
      expect(searchButton).not.toBeDisabled();
    });
  });

  describe('Placeholder', () => {
    it('should display default placeholder', () => {
      render(<FilterTextbox fields={['bookingNumber']} />);

      const input = screen.getByRole('textbox');
      // TODO(i18n): Replace with translation key
      expect(input).toHaveAttribute('placeholder', expect.stringMatching(/search|filter/i));
    });

    it('should display custom placeholder with field names appended', () => {
      render(
        <FilterTextbox
          fields={['bookingNumber']}
          placeholder="Search booking orders..."
        />
      );

      const input = screen.getByRole('textbox');
      // Custom placeholder with field names appended
      expect(input).toHaveAttribute('placeholder', 'Search booking orders... (Booking Number)');
    });

    it('should append multiple field names to placeholder', () => {
      render(
        <FilterTextbox
          fields={['bookingNumber', 'agentCode', 'vesselCode']}
          placeholder="Search..."
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Search... (Booking Number, Agent Code, Vessel Code)');
    });

    it('should truncate field names after 3 fields', () => {
      render(
        <FilterTextbox
          fields={['bookingNumber', 'agentCode', 'vesselCode', 'voyage', 'eta']}
          placeholder="Search..."
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Search... (Booking Number, Agent Code, Vessel Code, ...)');
    });
  });

  describe('Field Array Passing', () => {
    it('should pass fields array to onSearch callback', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber', 'agentCode', 'vesselCode'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025{Enter}');

      // onSearch should receive the exact fields array
      expect(onSearch).toHaveBeenCalledWith('BO-2025', fields);
    });

    it('should handle single field array', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const fields = ['bookingNumber'];

      render(<FilterTextbox fields={fields} onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'BO-2025{Enter}');

      expect(onSearch).toHaveBeenCalledWith('BO-2025', fields);
    });
  });

  describe('Accessibility', () => {
    describe('ARIA Labels', () => {
      it('should have default aria-label on input field', () => {
        render(<FilterTextbox fields={['bookingNumber']} />);

        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('aria-label', 'Search input');
      });

      it('should have default aria-label on search button', () => {
        render(<FilterTextbox fields={['bookingNumber']} />);

        const searchButton = screen.getByRole('button', { name: 'Search' });
        expect(searchButton).toHaveAttribute('aria-label', 'Search');
      });

      it('should have default aria-label on clear button when visible', async () => {
        const user = userEvent.setup();
        render(<FilterTextbox fields={['bookingNumber']} />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'BO-2025');

        const clearButton = screen.getByRole('button', { name: 'Clear filter' });
        expect(clearButton).toHaveAttribute('aria-label', 'Clear filter');
      });

      it('should support custom aria labels', async () => {
        const user = userEvent.setup();
        const customAriaLabels = {
          input: 'Custom search input',
          searchButton: 'Custom search button',
          clearButton: 'Custom clear button',
        };

        render(
          <FilterTextbox
            fields={['bookingNumber']}
            ariaLabels={customAriaLabels}
          />
        );

        // Custom input label
        const input = screen.getByRole('textbox', { name: customAriaLabels.input });
        expect(input).toHaveAttribute('aria-label', customAriaLabels.input);

        // Custom search button label
        const searchButton = screen.getByRole('button', { name: customAriaLabels.searchButton });
        expect(searchButton).toHaveAttribute('aria-label', customAriaLabels.searchButton);

        // Type to show clear button
        await user.type(input, 'BO-2025');

        // Custom clear button label
        const clearButton = screen.getByRole('button', { name: customAriaLabels.clearButton });
        expect(clearButton).toHaveAttribute('aria-label', customAriaLabels.clearButton);
      });
    });

    describe('ARIA Describedby Linkage', () => {
      it('should link input to helper text via aria-describedby when fields are empty', () => {
        render(<FilterTextbox fields={[]} />);

        const input = screen.getByRole('textbox');
        const helperText = screen.getByText(/no.*field.*configured/i);

        // Input should have aria-describedby pointing to helper text
        expect(input).toHaveAttribute('aria-describedby', 'filter-helper-text');
        expect(helperText).toHaveAttribute('id', 'filter-helper-text');
      });

      it('should not have aria-describedby when no helper text is shown', () => {
        render(<FilterTextbox fields={['bookingNumber']} />);

        const input = screen.getByRole('textbox');
        expect(input).not.toHaveAttribute('aria-describedby');
      });
    });

    describe('ARIA Live Region', () => {
      it('should have aria-live region for screen reader announcements', () => {
        const { container } = render(<FilterTextbox fields={['bookingNumber']} />);

        // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
        const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
        expect(liveRegion).toBeInTheDocument();
        expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      });

      it('should have sr-only class on live region (visually hidden)', () => {
        const { container } = render(<FilterTextbox fields={['bookingNumber']} />);

        // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
        const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
        expect(liveRegion).toHaveClass('sr-only');
      });

      it('should announce filtering when ariaFilteringMessage is provided', async () => {
        const user = userEvent.setup();
        const ariaFilteringMessage = 'Filtering results...';

        const { container } = render(
          <FilterTextbox
            fields={['bookingNumber']}
            ariaFilteringMessage={ariaFilteringMessage}
          />
        );

        const input = screen.getByRole('textbox');
        await user.type(input, 'BO-2025');

        const searchButton = screen.getByRole('button', { name: /search/i });
        await user.click(searchButton);

        // Verify live region has the filtering message
        // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
        const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
        await waitFor(() => {
          expect(liveRegion).toHaveTextContent(ariaFilteringMessage);
        });
      });

      it('should announce cleared when ariaClearedMessage is provided', async () => {
        const user = userEvent.setup();
        const ariaClearedMessage = 'Filter cleared';

        const { container } = render(
          <FilterTextbox
            fields={['bookingNumber']}
            ariaClearedMessage={ariaClearedMessage}
          />
        );

        const input = screen.getByRole('textbox');
        await user.type(input, 'BO-2025');

        const clearButton = screen.getByRole('button', { name: /clear/i });
        await user.click(clearButton);

        // Verify live region has the cleared message
        // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
        const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
        await waitFor(() => {
          expect(liveRegion).toHaveTextContent(ariaClearedMessage);
        });
      });
    });

    describe('Keyboard Navigation', () => {
      it('should support Tab key navigation to input', async () => {
        const user = userEvent.setup();
        render(<FilterTextbox fields={['bookingNumber']} />);

        const input = screen.getByRole('textbox');

        // Tab to input
        await user.tab();
        expect(input).toHaveFocus();
      });

      it('should support Tab key navigation to search button', async () => {
        const user = userEvent.setup();
        render(<FilterTextbox fields={['bookingNumber']} />);

        const searchButton = screen.getByRole('button', { name: /search/i });

        // Tab to input, then to search button
        await user.tab();
        await user.tab();
        expect(searchButton).toHaveFocus();
      });

      it('should support Tab key navigation to clear button when visible', async () => {
        const user = userEvent.setup();
        render(<FilterTextbox fields={['bookingNumber']} />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'BO-2025');

        // Tab to clear button
        await user.tab();
        const clearButton = screen.getByRole('button', { name: /clear/i });
        expect(clearButton).toHaveFocus();
      });

      it('should trigger search on Enter key without losing focus', async () => {
        const user = userEvent.setup();
        const onSearch = vi.fn();
        render(<FilterTextbox fields={['bookingNumber']} onSearch={onSearch} />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'BO-2025{Enter}');

        // Verify search was triggered
        expect(onSearch).toHaveBeenCalledWith('BO-2025', ['bookingNumber']);

        // Verify input still has focus (Enter doesn't blur)
        expect(input).toHaveFocus();
      });

      it('should support Space/Enter key on search button', async () => {
        const user = userEvent.setup();
        const onSearch = vi.fn();
        render(<FilterTextbox fields={['bookingNumber']} onSearch={onSearch} />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'BO-2025');

        // Tab to clear button, then to search button (clear button appears when there's text)
        await user.tab(); // Clear button
        await user.tab(); // Search button
        const searchButton = screen.getByRole('button', { name: /search/i });
        expect(searchButton).toHaveFocus();

        // Press Enter on search button
        await user.keyboard('{Enter}');
        expect(onSearch).toHaveBeenCalledWith('BO-2025', ['bookingNumber']);
      });

      it('should support Space/Enter key on clear button', async () => {
        const user = userEvent.setup();
        const onClear = vi.fn();
        render(<FilterTextbox fields={['bookingNumber']} onClear={onClear} />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'BO-2025');

        // Tab to clear button
        await user.tab();
        const clearButton = screen.getByRole('button', { name: /clear/i });
        expect(clearButton).toHaveFocus();

        // Press Enter on clear button
        await user.keyboard('{Enter}');
        expect(onClear).toHaveBeenCalledTimes(1);
        expect(input).toHaveValue('');
      });
    });

    describe('Focus Management', () => {
      it('should have focus ring on input when focused', async () => {
        const user = userEvent.setup();
        render(<FilterTextbox fields={['bookingNumber']} />);

        const input = screen.getByRole('textbox');
        await user.click(input);

        // Input should have focus ring classes
        expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
      });

      it('should have focus ring on search button when focused', async () => {
        const user = userEvent.setup();
        render(<FilterTextbox fields={['bookingNumber']} />);

        const searchButton = screen.getByRole('button', { name: /search/i });
        await user.tab();
        await user.tab();

        // Button should have focus ring classes
        expect(searchButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
      });

      it('should have focus ring on clear button when focused', async () => {
        const user = userEvent.setup();
        render(<FilterTextbox fields={['bookingNumber']} />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'BO-2025');

        await user.tab();
        const clearButton = screen.getByRole('button', { name: /clear/i });

        // Button should have focus ring classes
        expect(clearButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
      });
    });

    describe('Disabled State Accessibility', () => {
      it('should properly disable input when disabled prop is true', () => {
        render(<FilterTextbox fields={['bookingNumber']} disabled={true} />);

        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
        expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
      });

      it('should properly disable input when fields array is empty', () => {
        render(<FilterTextbox fields={[]} />);

        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
      });

      it('should properly disable search button when disabled', () => {
        render(<FilterTextbox fields={[]} />);

        const searchButton = screen.getByRole('button', { name: /search/i });
        expect(searchButton).toBeDisabled();
        expect(searchButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
      });
    });
  });
});
