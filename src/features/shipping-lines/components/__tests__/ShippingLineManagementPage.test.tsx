import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShippingLineManagementPage from '../ShippingLineManagementPage';
import { useAuth } from '@/features/auth/useAuth';

const mockUseShippingLines = vi.fn();
const mockUseShippingLineStats = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/use-shipping-lines-query', () => ({
  useShippingLines: (...args: unknown[]) => mockUseShippingLines(...args),
  useShippingLineStats: (...args: unknown[]) => mockUseShippingLineStats(...args),
  useCreateShippingLine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateShippingLine: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../ShippingLineModal', () => ({
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
      <ShippingLineManagementPage />
    </QueryClientProvider>,
  );
};

describe('ShippingLineManagementPage RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShippingLines.mockReturnValue({
      data: {
        results: [{ id: 'sl-1', code: 'SL1', name: 'Shipping Line One' }],
        total: 1,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    mockUseShippingLineStats.mockReturnValue({
      data: {
        totalShippingLines: 1,
        totalActiveShippingLines: 1,
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
      screen.getByRole('button', { name: /add shipping line/i }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
  });

  it('enables write actions when write permission is granted', () => {
    mockedUseAuth.mockReturnValue({
      can: vi.fn().mockReturnValue(true),
    } as any);

    renderWithClient();

    expect(
      screen.getByRole('button', { name: /add shipping line/i }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: /edit/i })).toBeEnabled();
  });
});
