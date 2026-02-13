import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForwarderManagementPage from '../ForwarderManagementPage';
import { useAuth } from '@/features/auth/useAuth';

const mockUseForwarders = vi.fn();
const mockUseForwarderStats = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/use-forwarders-query', () => ({
  useForwarders: (...args: unknown[]) => mockUseForwarders(...args),
  useForwarderStats: (...args: unknown[]) => mockUseForwarderStats(...args),
  useCreateForwarder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateForwarder: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../ForwarderModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/shared/components/DynamicFilter', () => ({
  __esModule: true,
  DynamicFilter: () => null,
}));

vi.mock('@/shared/components/EntityTable', () => ({
  __esModule: true,
  default: ({ entities, actions }: any) => (
    <div>
      {entities.map((entity: any) => (
        <div key={entity.id}>
          {actions.map((action: any) => (
            <button
              key={action.key}
              onClick={() => action.onClick(entity)}
              disabled={action.disabled?.(entity)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
}));

const mockedUseAuth = vi.mocked(useAuth);

const renderWithClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ForwarderManagementPage />
    </QueryClientProvider>,
  );
};

describe('ForwarderManagementPage RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseForwarders.mockReturnValue({
      data: {
        results: [{ id: 'fwd-1', code: 'FWD1', name: 'Forwarder One' }],
        total: 1,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    mockUseForwarderStats.mockReturnValue({
      data: {
        totalForwarders: 1,
        totalActiveForwarders: 1,
        totalActiveContracts: 1,
      },
      isLoading: false,
    });
  });

  it('disables write actions when missing write permission', () => {
    mockedUseAuth.mockReturnValue({
      can: vi.fn().mockReturnValue(false),
    } as any);

    renderWithClient();

    expect(
      screen.getByRole('button', { name: /add forwarder/i }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
  });

  it('enables write actions when write permission is granted', () => {
    mockedUseAuth.mockReturnValue({
      can: vi.fn().mockReturnValue(true),
    } as any);

    renderWithClient();

    expect(
      screen.getByRole('button', { name: /add forwarder/i }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: /edit/i })).toBeEnabled();
  });
});
