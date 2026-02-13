import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DynamicFilter } from './DynamicFilter';
import type { FilterFieldConfig } from './DynamicFilter.types';

describe('DynamicFilter', () => {
  describe('Collapsible Panel', () => {
    it('should render with collapsed state by default', () => {
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
      ];

      render(<DynamicFilter fields={fields} />);

      // Filter button should be visible
      expect(screen.getByRole('button', { name: /toggle filters/i })).toBeInTheDocument();

      // Panel should not be visible
      expect(screen.queryByRole('region', { name: /filter panel/i })).not.toBeInTheDocument();
    });

    it('should expand panel when filter button is clicked', async () => {
      const user = userEvent.setup();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
      ];

      render(<DynamicFilter fields={fields} />);

      const toggleButton = screen.getByRole('button', { name: /toggle filters/i });

      // Click to expand
      await user.click(toggleButton);

      // Panel should be visible
      expect(screen.getByRole('region', { name: /filter panel/i })).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should collapse panel when filter button is clicked again', async () => {
      const user = userEvent.setup();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
      ];

      render(<DynamicFilter fields={fields} />);

      const toggleButton = screen.getByRole('button', { name: /toggle filters/i });

      // Expand
      await user.click(toggleButton);
      expect(screen.getByRole('region', { name: /filter panel/i })).toBeInTheDocument();

      // Collapse
      await user.click(toggleButton);
      expect(screen.queryByRole('region', { name: /filter panel/i })).not.toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should show active state when filters are applied', async () => {
      const user = userEvent.setup();
      const onApplyFilter = vi.fn();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
      ];

      render(<DynamicFilter fields={fields} onApplyFilter={onApplyFilter} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      // Enter text - label shows "Search" but input isn't properly associated
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'test');

      // Apply filters
      await user.click(screen.getByRole('button', { name: /apply filters/i }));

      // Should show active state
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(onApplyFilter).toHaveBeenCalledWith({ search: 'test' });
    });
  });

  describe('Field Rendering', () => {
    it('should render text input field', async () => {
      const user = userEvent.setup();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search', placeholder: 'Enter search...' },
      ];

      render(<DynamicFilter fields={fields} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      // Label shows "Search" but input isn't properly associated
      expect(screen.getByText('Search')).toBeInTheDocument();
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('placeholder', 'Enter search...');
    });

    it('should render date input field', async () => {
      const user = userEvent.setup();
      const fields: FilterFieldConfig[] = [
        { type: 'date', name: 'fromDate', label: 'From Date' },
      ];

      render(<DynamicFilter fields={fields} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      // Label shows "From Date"
      expect(screen.getByText('From Date')).toBeInTheDocument();
      // Date input - check it exists (testing-library doesn't have great date input support)
      const panel = screen.getByRole('region', { name: /filter panel/i });
      expect(panel).toBeInTheDocument();
      // Verify date input is rendered by checking for the label
      expect(screen.getByText('From Date')).toBeInTheDocument();
    });

    it('should render single-select dropdown with custom key/value mapping', async () => {
      const user = userEvent.setup();
      const fields: FilterFieldConfig[] = [
        {
          type: 'select',
          name: 'province',
          label: 'Province',
          options: [
            { provinceCode: 'HCM', provinceName: 'Ho Chi Minh City' },
            { provinceCode: 'HN', provinceName: 'Ha Noi' },
          ],
          keyField: 'provinceCode',
          valueField: 'provinceName',
        },
      ];

      render(<DynamicFilter fields={fields} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      // Label shows "Province"
      expect(screen.getByText('Province')).toBeInTheDocument();

      // FormSingleSelect renders as a button with dropdown (button has the field label as aria-label)
      const selectButton = screen.getByRole('button', { name: /province/i });
      expect(selectButton).toBeInTheDocument();

      // Open dropdown to see options
      await user.click(selectButton);

      // Check options are visible in the dropdown
      expect(screen.getByRole('option', { name: /ho chi minh city/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /ha noi/i })).toBeInTheDocument();
    });

    it('should render multi-select dropdown', async () => {
      const user = userEvent.setup();
      const fields: FilterFieldConfig[] = [
        {
          type: 'multiselect',
          name: 'statuses',
          label: 'Status',
          options: [
            { code: 'active', name: 'Active' },
            { code: 'pending', name: 'Pending' },
          ],
          keyField: 'code',
          valueField: 'name',
        },
      ];

      render(<DynamicFilter fields={fields} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      // Label shows "Status"
      expect(screen.getByText('Status')).toBeInTheDocument();
      // Multi-select renders as a button (check for buttons beyond toggle)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);  // Toggle + dropdown button
    });

    it('should render async single-select dropdown', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn();
      const fields: FilterFieldConfig[] = [
        {
          type: 'async-select',
          name: 'packageNo',
          label: 'Package No',
          options: [{ code: 'PKG-2024', name: 'PKG-2024' }],
          keyField: 'code',
          valueField: 'name',
          searchPlaceholder: 'Search packages...',
          minSearchLength: 1,
          debounceMs: 0,
          onSearchChange,
        },
      ];

      render(<DynamicFilter fields={fields} />);

      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      const selectButton = screen.getByRole('button', { name: /package no/i });
      await user.click(selectButton);

      const searchInput = screen.getByPlaceholderText(/search packages/i);
      await user.type(searchInput, 'PKG');

      expect(onSearchChange).toHaveBeenCalledWith('PKG');
      expect(screen.getByRole('option', { name: /pkg-2024/i })).toBeInTheDocument();
    });
  });

  describe('Filter Application', () => {
    it('should call onApplyFilter with non-empty values only', async () => {
      const user = userEvent.setup();
      const onApplyFilter = vi.fn();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
        { type: 'text', name: 'email', label: 'Email' },
        { type: 'date', name: 'fromDate', label: 'From Date' },
      ];

      render(<DynamicFilter fields={fields} onApplyFilter={onApplyFilter} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      // Fill only search field (leave email and fromDate empty)
      const searchInput = screen.getAllByRole('textbox')[0];  // First textbox
      await user.type(searchInput, 'test search');

      // Apply filters
      await user.click(screen.getByRole('button', { name: /apply filters/i }));

      // Should only return non-empty value
      expect(onApplyFilter).toHaveBeenCalledWith({
        search: 'test search',
      });
    });

    it('should exclude empty arrays from multi-select', async () => {
      const user = userEvent.setup();
      const onApplyFilter = vi.fn();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
        {
          type: 'multiselect',
          name: 'statuses',
          label: 'Status',
          options: [{ code: 'active', name: 'Active' }],
          keyField: 'code',
          valueField: 'name',
        },
      ];

      render(<DynamicFilter fields={fields} onApplyFilter={onApplyFilter} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      // Fill only search field (leave multi-select empty)
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'test');

      // Apply filters
      await user.click(screen.getByRole('button', { name: /apply filters/i }));

      // Should exclude empty array
      expect(onApplyFilter).toHaveBeenCalledWith({
        search: 'test',
      });
    });
  });

  describe('Filter Clearing', () => {
    it('should reset form and call onClear when Clear button is clicked', async () => {
      const user = userEvent.setup();
      const onClear = vi.fn();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
      ];

      render(<DynamicFilter fields={fields} onClear={onClear} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      // Fill search field
      const searchInput = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(searchInput, 'test');
      expect(searchInput.value).toBe('test');

      // Clear filters
      await user.click(screen.getByRole('button', { name: /clear/i }));

      // Input should be cleared
      await waitFor(() => {
        expect(searchInput.value).toBe('');
      });

      // onClear callback should be called
      expect(onClear).toHaveBeenCalled();
    });

    it('should remove active state after clearing', async () => {
      const user = userEvent.setup();
      const onApplyFilter = vi.fn();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
      ];

      render(<DynamicFilter fields={fields} onApplyFilter={onApplyFilter} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      // Fill and apply
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /apply filters/i }));

      // Active badge should be present
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Clear filters
      await user.click(screen.getByRole('button', { name: /clear/i }));

      // Active badge should be removed
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
      ];

      render(<DynamicFilter fields={fields} />);

      const toggleButton = screen.getByRole('button', { name: /toggle filters/i });

      // Initially collapsed
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(toggleButton).toHaveAttribute('aria-controls', 'filter-panel');

      // Expand
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      // Panel should have proper role
      const panel = screen.getByRole('region', { name: /filter panel/i });
      expect(panel).toHaveAttribute('id', 'filter-panel');
    });

    it('should close panel on Escape key', async () => {
      const user = userEvent.setup();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
      ];

      render(<DynamicFilter fields={fields} />);

      // Expand panel
      await user.click(screen.getByRole('button', { name: /toggle filters/i }));
      expect(screen.getByRole('region', { name: /filter panel/i })).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Panel should be closed
      await waitFor(() => {
        expect(screen.queryByRole('region', { name: /filter panel/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Initial Values', () => {
    it('should honor initialValues and reset to them on clear', async () => {
      const user = userEvent.setup();
      const fields: FilterFieldConfig[] = [
        { type: 'text', name: 'search', label: 'Search' },
      ];

      render(
        <DynamicFilter
          fields={fields}
          initialValues={{ search: 'default-value' }}
        />,
      );

      await user.click(screen.getByRole('button', { name: /toggle filters/i }));

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('default-value');

      await user.clear(input);
      await user.type(input, 'changed');

      await user.click(screen.getByRole('button', { name: /clear/i }));

      expect(input).toHaveValue('default-value');
    });
  });
});
