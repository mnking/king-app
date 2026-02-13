import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContainerPositionStatusPage from '../components/ContainerPositionStatusPage';
import type { ContainerPosition } from '../types';
import type { ApiResponse, PaginatedResponse } from '@/features/booking-orders/types';
import { bookingOrderContainersApi } from '@/services/apiCFS';
import { useAuth } from '@/features/auth/useAuth';

// Mock EntityTable to simplify interactions
vi.mock('@/shared/components/EntityTable', () => ({
  __esModule: true,
  default: ({ entities, actions }: any) => (
    <div>
      {entities.map((entity: any) => (
        <div key={entity.id}>
          <span>{entity.containerNumber}</span>
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

// Mock available containers hook
const mockUseAvailableContainers = vi.fn();
vi.mock('../hooks', () => ({
  useAvailableContainers: (...args: any[]) => mockUseAvailableContainers(...args),
  useForwardersForContainerPosition: (...args: any[]) => mockUseForwarders(...args),
}));

// Mock forwarders hook used for filter options
const mockUseForwarders = vi.fn();
vi.mock('@/features/forwarder/hooks/use-forwarders-query', () => ({
  useForwarders: (...args: any[]) => mockUseForwarders(...args),
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock API update
vi.mock('@/services/apiCFS', async () => {
  const actual = await vi.importActual<any>('@/services/apiCFS');
  return {
    ...actual,
    bookingOrderContainersApi: {
      ...actual.bookingOrderContainersApi,
      update: vi.fn(),
    },
  };
});

const buildContainer = (overrides: Partial<ContainerPosition> = {}): ContainerPosition => ({
  id: 'c1',
  orderId: 'o1',
  containerId: 'container-id',
  containerNo: 'MSCU1234567',
  mblNumber: null,
  sealNumber: '',
  yardFreeFrom: null,
  yardFreeTo: null,
  extractFrom: null,
  extractTo: null,
  customsClearedAt: null,
  cargoReleasedAt: null,
  isPriority: false,
  customsStatus: 'REGISTERED',
  cargoReleaseStatus: 'REQUESTED',
  containerFile: null,
  summary: null,
  containerStatus: null,
  order: {
    id: 'o1',
    code: 'PBO-1',
    status: 'APPROVED',
    agentId: 'fwd-1',
    agentCode: 'FWD1',
    bookingNumber: null,
    eta: '2025-11-02',
  },
  ...overrides,
});

const mockResponse = (container: ContainerPosition): ApiResponse<PaginatedResponse<ContainerPosition>> => ({
  statusCode: 200,
  data: {
    results: [container],
    total: 1,
  },
});

describe('ContainerPositionStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      can: vi.fn().mockReturnValue(true),
    } as any);
    mockUseAvailableContainers.mockReset();
    mockUseForwarders.mockReset();
    mockUseForwarders.mockReturnValue({
      data: { results: [] },
      isLoading: false,
      error: null,
    });
  });

  it('enables both actions when status is unknown', async () => {
    const user = userEvent.setup();
    mockUseAvailableContainers.mockReturnValue({
      data: mockResponse(buildContainer({ containerStatus: null })).data,
      isLoading: false,
      isFetching: false,
      error: null,
    });
    render(<ContainerPositionStatusPage />);
    await user.click(screen.getByText('Edit'));

    const dischargeButton = screen.getByRole('button', { name: /discharge/i });
    const storeButton = screen.getByRole('button', { name: /store/i });
    expect(dischargeButton).toBeEnabled();
    expect(storeButton).toBeEnabled();
  });

  it('disables discharge but allows store when status is AT_PORT', async () => {
    const user = userEvent.setup();
    mockUseAvailableContainers.mockReturnValue({
      data: mockResponse(buildContainer({ containerStatus: 'AT_PORT' })).data,
      isLoading: false,
      isFetching: false,
      error: null,
    });
    render(<ContainerPositionStatusPage />);
    await user.click(screen.getByText('Edit'));
    expect(screen.getByRole('button', { name: /discharge/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /store/i })).toBeEnabled();
  });

  it('disables both actions when status is IN_YARD', async () => {
    const user = userEvent.setup();
    mockUseAvailableContainers.mockReturnValue({
      data: mockResponse(buildContainer({ containerStatus: 'IN_YARD' })).data,
      isLoading: false,
      isFetching: false,
      error: null,
    });
    render(<ContainerPositionStatusPage />);
    await user.click(screen.getByText('Edit'));
    expect(screen.getByRole('button', { name: /discharge/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /store/i })).toBeDisabled();
  });

  it('sends backend status values on save', async () => {
    const user = userEvent.setup();
    const container = buildContainer({ containerStatus: null });
    mockUseAvailableContainers.mockReturnValue({
      data: mockResponse(container).data,
      isLoading: false,
      isFetching: false,
      error: null,
    });

    const updateMock = vi.mocked(bookingOrderContainersApi.update);
    mockUseAvailableContainers.mockReturnValue({
      data: mockResponse(container).data,
      isLoading: false,
      isFetching: false,
      error: null,
    });

    updateMock.mockResolvedValue({
      statusCode: 200,
      data: { ...container, containerStatus: 'IN_YARD' },
    });

    render(<ContainerPositionStatusPage />);

    await user.click(screen.getByText('Edit'));
    await user.click(screen.getByRole('button', { name: /store/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(container.id, {
        sealNumber: '',
        eta: '2025-11-02',
        containerStatus: 'IN_YARD',
      }),
    );
  });

  it('disables edit when missing write permission', () => {
    vi.mocked(useAuth).mockReturnValue({
      can: vi.fn().mockReturnValue(false),
    } as any);
    mockUseAvailableContainers.mockReturnValue({
      data: mockResponse(buildContainer({ containerStatus: null })).data,
      isLoading: false,
      isFetching: false,
      error: null,
    });

    render(<ContainerPositionStatusPage />);

    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
  });
});
