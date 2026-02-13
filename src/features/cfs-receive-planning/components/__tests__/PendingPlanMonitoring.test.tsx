import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, userEvent } from '@/test/utils';
import { PendingPlanMonitoring } from '../PendingPlanMonitoring';
import type { EnrichedReceivePlan } from '../../hooks/use-plans-query';
import type { PaginatedResponse, CustomsStatus, CargoReleaseStatus } from '@/shared/features/plan/types';

const mockUsePendingPlansMonitoring = vi.hoisted(() => vi.fn());
const mockUsePlans = vi.hoisted(() => vi.fn());
const mockUseChangePlanStatus = vi.hoisted(() => vi.fn());

vi.mock('@/features/cfs-receive-planning/hooks', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/features/cfs-receive-planning/hooks');
  return {
    ...actual,
    usePendingPlansMonitoring: mockUsePendingPlansMonitoring,
    usePlans: mockUsePlans,
    useChangePlanStatus: mockUseChangePlanStatus,
  };
});

const buildPlan = (overrides: Partial<EnrichedReceivePlan> = {}): EnrichedReceivePlan => ({
  id: 'plan-pending-1',
  code: 'PLAN-PENDING-1',
  status: 'PENDING',
  plannedStart: '2024-11-10T08:00:00Z',
  plannedEnd: '2024-11-10T17:00:00Z',
  executionStart: '2024-11-10T08:30:00Z',
  executionEnd: null,
  pendingDate: '2024-11-11T09:00:00Z',
  equipmentBooked: true,
  portNotified: true,
  createdAt: '2024-11-09T10:00:00Z',
  updatedAt: '2024-11-11T09:00:00Z',
  containers:
    overrides.containers ||
    [
      {
        id: 'container-pending-1',
        planId: 'plan-pending-1',
        orderContainerId: 'oc-pending-1',
        assignedAt: '2024-11-08T08:00:00Z',
        unassignedAt: null,
        status: 'WAITING' as const,
        truckNo: null,
        receivedAt: null,
        rejectedAt: null,
        receivedType: 'NORMAL' as const,
        completed: false,
        notes: null,
        orderContainer: {
          id: 'oc-pending-1',
          orderId: 'order-pending-1',
          containerId: 'container-master-1',
          containerNo: 'MSCU7654321',
          sealNumber: 'SEAL-PENDING-1',
          yardFreeFrom: null,
          yardFreeTo: null,
          extractFrom: null,
          extractTo: null,
          isPriority: false,
          mblNumber: 'MBL-PENDING-1',
          customsStatus: 'PENDING' as CustomsStatus,
          cargoReleaseStatus: 'PENDING' as CargoReleaseStatus,
          summary: { typeCode: '40HC' },
          hbls: [
            {
              id: 'hbl-pending-1',
              orderContainerId: 'oc-pending-1',
              hblId: 'hbl-pending-1',
              hblNo: 'HBL-PENDING-1',
            },
          ],
          bookingOrder: {
            id: 'order-pending-1',
            code: 'ORD-PENDING-1',
            agentCode: null,
            eta: '2024-11-10T00:00:00Z',
            vesselCode: null,
            voyage: 'VN001',
          },
          enrichedHbls: [],
          atYard: false,
        },
      },
      {
        id: 'container-pending-2',
        planId: 'plan-pending-1',
        orderContainerId: 'oc-pending-2',
        assignedAt: '2024-11-08T08:30:00Z',
        unassignedAt: null,
        status: 'REJECTED' as const,
        truckNo: null,
        receivedAt: null,
        rejectedAt: '2024-11-11T08:00:00Z',
        receivedType: 'NORMAL' as const,
        completed: false,
        notes: null,
        orderContainer: {
          id: 'oc-pending-2',
          orderId: 'order-pending-2',
          containerId: 'container-master-2',
          containerNo: 'MSCU9999999',
          sealNumber: 'SEAL-PENDING-2',
          yardFreeFrom: null,
          yardFreeTo: null,
          extractFrom: null,
          extractTo: null,
          isPriority: false,
          mblNumber: 'MBL-PENDING-2',
          customsStatus: 'PENDING' as CustomsStatus,
          cargoReleaseStatus: 'PENDING' as CargoReleaseStatus,
          summary: { typeCode: '20GP' },
          hbls: [
            {
              id: 'hbl-pending-2',
              orderContainerId: 'oc-pending-2',
              hblId: 'hbl-pending-2',
              hblNo: 'HBL-PENDING-2',
            },
          ],
          bookingOrder: {
            id: 'order-pending-2',
            code: 'ORD-PENDING-2',
            agentCode: null,
            eta: '2024-11-10T00:00:00Z',
            vesselCode: null,
            voyage: 'VN001',
          },
          enrichedHbls: [],
          atYard: false,
        },
      },
    ],
  ...overrides,
});

const buildResponse = (plans: EnrichedReceivePlan[]): PaginatedResponse<EnrichedReceivePlan> => ({
  results: plans,
  total: plans.length,
  page: 1,
  itemsPerPage: plans.length,
});

describe('PendingPlanMonitoring', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2024-11-18T10:00:00Z'));
    mockUsePendingPlansMonitoring.mockReturnValue({
      data: buildResponse([buildPlan()]),
      isLoading: false,
      isError: false,
    });
    mockUsePlans.mockReturnValue({ data: { results: [], total: 0 } });
    mockUseChangePlanStatus.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders plans and prioritizes rejected containers in the drill-down', async () => {
    const user = userEvent.setup();
    render(<PendingPlanMonitoring />);

    expect(screen.getByText('PLAN-PENDING-1')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /toggle containers for plan-pending-1/i }),
    );

    const containers = screen.getAllByTestId(/pending-plan-container-/i);
    expect(containers[0]).toHaveAttribute('data-status', 'REJECTED');
  });
});
