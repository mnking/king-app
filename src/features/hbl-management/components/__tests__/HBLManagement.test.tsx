import { describe, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import HBLManagement from '../HBLManagement';
import type { HBLsQueryParams } from '../../types';

const mockUseHBLs = vi.fn();
const mockUseForwarders = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../hooks/use-hbls-query', () => {
  const createMutation = () => ({ mutateAsync: vi.fn() });
  return {
    useHBLs: (...args: unknown[]) => mockUseHBLs(...args),
    useCreateHBL: createMutation,
    useUpdateHBL: createMutation,
    useApproveHBL: createMutation,
    useMarkHBLDone: createMutation,
    useDeleteHBL: createMutation,
    hblQueryKeys: {
      lists: () => ['hbls', 'list'] as const,
    },
  };
});

vi.mock('@/features/forwarder', () => ({
  useForwarders: (...args: unknown[]) => mockUseForwarders(...args),
}));

const renderWithClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HBLManagement />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { ...utils, queryClient };
};

/**
 * Helper to select an option from FormSingleSelect dropdown
 * @param user - userEvent instance
 * @param labelText - The label of the select field
 * @param optionText - The option text to click
 */
const selectFormSingleSelectOption = async (
  user: ReturnType<typeof userEvent.setup>,
  labelText: string,
  optionText: string,
) => {
  // FormSingleSelect button uses the label as aria-label
  const dropdownButton = screen.getByRole('button', { name: new RegExp(labelText, 'i') });

  // Open the dropdown
  await user.click(dropdownButton);

  // Click the option
  const option = screen.getByRole('option', { name: new RegExp(optionText, 'i') });
  await user.click(option);
};

/**
 * Helper to get all option texts from FormSingleSelect dropdown
 * Opens the dropdown, gets options, then closes it
 * @param user - userEvent instance
 * @param labelText - The label of the select field
 * @returns Array of option texts (including placeholder)
 */
const getFormSingleSelectOptions = async (
  user: ReturnType<typeof userEvent.setup>,
  labelText: string,
): Promise<string[]> => {
  // FormSingleSelect button uses the label as aria-label
  const dropdownButton = screen.getByRole('button', { name: new RegExp(labelText, 'i') });

  // Get current button text (placeholder or selected value)
  const buttonText = dropdownButton.textContent || '';

  // Open the dropdown
  await user.click(dropdownButton);

  // Get all options from the listbox
  const listbox = screen.getByRole('listbox');
  const options = within(listbox).getAllByRole('option');
  const optionTexts = options.map((opt) => opt.textContent || '');

  // Close dropdown by clicking outside
  await user.click(document.body);

  // Prepend placeholder if it's showing
  if (buttonText.includes('Select') || buttonText.includes('...')) {
    return [buttonText, ...optionTexts];
  }

  return optionTexts;
};

describe('HBLManagement filters', () => {
  const baseQueryResult = {
    data: { results: [], total: 0 },
    isLoading: false,
    isFetching: false,
    error: null,
  };

  beforeEach(() => {
    mockUseHBLs.mockReset();
    mockUseHBLs.mockImplementation(() => baseQueryResult);
    mockUseForwarders.mockReset();
    mockUseForwarders.mockImplementation(() => ({
      data: {
        results: [
          { id: 'fwd-1', name: 'Alpha Logistics' },
          { id: 'fwd-2', name: 'Beta Shipping' },
        ],
        total: 2,
      },
      isLoading: false,
    }));
  });

  it('applies received date, container, and seal filters via DynamicFilter to the HBL query', async () => {
    const { queryClient } = renderWithClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    expect(mockUseHBLs).toHaveBeenCalled();
    const initialCall = mockUseHBLs.mock.calls.at(0)?.[0] as HBLsQueryParams;
    expect(initialCall).toMatchObject({ page: 1, itemsPerPage: 100, hasPackingList: true });

    const user = userEvent.setup();

    // Open the DynamicFilter panel
    const filterButton = screen.getByLabelText('Toggle filters');
    await user.click(filterButton);

    // Wait for filter panel to open
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Filter panel' })).toBeInTheDocument();
    });

    const receiveDateInput = screen.getByLabelText('Receive date');
    await user.type(receiveDateInput, '2024-07-10');

    // Fill in container number and seal number filters
    const containerInput = screen.getByPlaceholderText('e.g., MSCU6639871');
    await user.type(containerInput, 'mscu6639871');
    const sealInput = screen.getByPlaceholderText('e.g., SEAL001234');
    await user.type(sealInput, 'seal-001');

    // Click Apply Filters button
    const applyButton = screen.getByRole('button', { name: /Apply Filters/i });
    await user.click(applyButton);

    await waitFor(() => {
      const lastCall = mockUseHBLs.mock.calls.at(-1)?.[0] as HBLsQueryParams;
      expect(lastCall?.receivedAt).toBe('2024-07-10');
      expect(lastCall?.containerNumber).toBe('mscu6639871');
      expect(lastCall?.sealNumber).toBe('seal-001');
    }, { timeout: 1500 });
    const lastCall = mockUseHBLs.mock.calls.at(-1)?.[0] as HBLsQueryParams;
    expect(lastCall?.page).toBe(1);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    // Click Clear button to clear filters
    const clearButton = screen.getByRole('button', { name: /Clear/i });
    await user.click(clearButton);

    await waitFor(() => {
      const latestCall = mockUseHBLs.mock.calls.at(-1)?.[0] as HBLsQueryParams;
      expect(latestCall?.receivedAt).toBeUndefined();
      expect(latestCall?.containerNumber).toBeUndefined();
      expect(latestCall?.sealNumber).toBeUndefined();
    }, { timeout: 1500 });
  });

  it('applies selected forwarder filter to the HBL query', async () => {
    renderWithClient();

    const user = userEvent.setup();

    // Open the DynamicFilter panel
    await user.click(screen.getByRole('button', { name: /toggle filters/i }));

    // Select a forwarder using the new FormSingleSelect
    await selectFormSingleSelectOption(user, 'Forwarder', 'Beta Shipping');

    // Apply filters
    await user.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      const lastCall = mockUseHBLs.mock.calls.at(-1)?.[0] as HBLsQueryParams;
      expect(lastCall?.issuerId).toBe('fwd-2');
    });

    // Clear all filters using DynamicFilter's Clear button
    await user.click(screen.getByRole('button', { name: /^clear$/i }));

    await waitFor(() => {
      const latestCall = mockUseHBLs.mock.calls.at(-1)?.[0] as HBLsQueryParams;
      expect(latestCall?.issuerId).toBeUndefined();
    });
  });

  it('applies keyword and status filters and limits status options', async () => {
    renderWithClient();

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /toggle filters/i }));

    // Check Status dropdown options
    const statusOptions = await getFormSingleSelectOptions(user, 'Status');
    expect(statusOptions).toEqual(['Select status...', 'Draft', 'Approved']);

    // Check Sort Field dropdown options
    const sortFieldOptions = await getFormSingleSelectOptions(user, 'Sort Field');
    expect(sortFieldOptions).toEqual([
      'Select sort field...',
      'HBL No',
      'Received Date',
      'Shipper',
      'Consignee',
      'Notify Party',
      'Vessel Name',
      'Voyage Number',
      'Port of Loading',
      'Port of Discharge',
    ]);

    // Check Sort Order dropdown options
    const sortOrderOptions = await getFormSingleSelectOptions(user, 'Sort Order');
    expect(sortOrderOptions).toEqual(['Select sort order...', 'Ascending', 'Descending']);

    // Select options using new helper
    await selectFormSingleSelectOption(user, 'Status', 'Approved');
    await selectFormSingleSelectOption(user, 'Sort Field', 'HBL No');
    await selectFormSingleSelectOption(user, 'Sort Order', 'Descending');

    const keywordInput = screen.getByLabelText('Keywords');
    await user.clear(keywordInput);
    await user.type(keywordInput, 'booking');

    await user.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      const lastCall = mockUseHBLs.mock.calls.at(-1)?.[0] as HBLsQueryParams;
      expect(lastCall?.status).toBe('Approved');
      expect(lastCall?.keywords).toBe('booking');
      expect(lastCall?.sortField).toBe('code');
      expect(lastCall?.sortOrder).toBe('DESC');
    });

    // Clear all filters using DynamicFilter's Clear button
    await user.click(screen.getByRole('button', { name: /^clear$/i }));

    await waitFor(() => {
      const latestCall = mockUseHBLs.mock.calls.at(-1)?.[0] as HBLsQueryParams;
      expect(latestCall?.status).toBeUndefined();
      expect(latestCall?.keywords).toBeUndefined();
      expect(latestCall?.sortField).toBeUndefined();
      expect(latestCall?.sortOrder).toBeUndefined();
    });
  }, 15000);

  it('keeps Import Excel button aligned while filter panel expands', async () => {
    renderWithClient();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /toggle filters/i }));

    const importButton = screen.getByRole('button', { name: 'Import Excel' });
    expect(importButton).not.toHaveClass('absolute');
    expect(importButton).toHaveClass('inline-flex');
    expect(importButton).toHaveClass('items-center');

    const dynamicFilter = screen.getByTestId('dynamic-filter');
    expect(dynamicFilter).toHaveClass('w-full');
  });
});
