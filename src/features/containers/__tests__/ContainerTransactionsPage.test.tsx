import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test';
import userEvent from '@testing-library/user-event';
import ContainerTransactionsPage from '../components/container-transactions/ContainerTransactionsPage';

const useContainerTransactionListMock = vi.fn();

vi.mock('../hooks/use-container-transactions', () => ({
  useContainerTransactionList: () => useContainerTransactionListMock(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useContainerTransactionListMock.mockReturnValue({
    data: { results: [], total: 0 },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  });
});

describe('ContainerTransactionsPage', () => {
  it('renders filter inputs', async () => {
    const user = userEvent.setup();
    render(<ContainerTransactionsPage />);

    await user.click(screen.getByRole('button', { name: /filters/i }));

    expect(screen.getByText('Container Number')).toBeInTheDocument();
    expect(screen.queryByText('New Transaction')).not.toBeInTheDocument();
  });
});
