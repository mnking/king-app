import React, { PropsWithChildren } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@/test';
import ContainerDetailPage from '../components/container-detail/ContainerDetailPage';

const useContainerMock = vi.fn();
const useContainerTransactionsByContainerMock = vi.fn();
const canMock = vi.fn();

vi.mock('../hooks/use-containers-query', () => ({
  useContainer: () => useContainerMock(),
}));

vi.mock('../hooks/use-container-transactions', () => ({
  useContainerTransactionsByContainer: () => useContainerTransactionsByContainerMock(),
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    can: canMock,
  }),
}));

vi.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@/services/apiContainerTransactions', () => ({
  containerTransactionsApi: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/apiContainers', () => ({
  containersApi: {
    getLastTransaction: vi.fn().mockResolvedValue({ data: null }),
  },
}));

const Wrapper = ({ children }: PropsWithChildren) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/containers/123']}>
        <Routes>
          <Route path="/containers/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  useContainerMock.mockReturnValue({
    data: null,
    isLoading: false,
  });
  useContainerTransactionsByContainerMock.mockReturnValue({
    data: { results: [], total: 0 },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  });
  canMock.mockReturnValue(true);
});

describe('ContainerDetailPage', () => {
  it('renders fallback when container is missing', () => {
    render(<ContainerDetailPage />, { wrapper: Wrapper });
    expect(document.body).toHaveTextContent('Container not found.');
  });
});
