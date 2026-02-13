import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, userEvent } from '@/test/utils';
import { DonePlanHistory } from '../DonePlanHistory';
import type { EnrichedReceivePlan } from '../../hooks/use-plans-query';
import type { PaginatedResponse, CustomsStatus, CargoReleaseStatus } from '@/shared/features/plan/types';
const mockUseDonePlansHistory = vi.hoisted(() => vi.fn());

vi.mock('@/features/cfs-receive-planning/hooks', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/features/cfs-receive-planning/hooks');
  return {
    ...actual,
    useDonePlansHistory: mockUseDonePlansHistory,
  };
});

const buildPlan = (overrides: Partial<EnrichedReceivePlan> = {}): EnrichedReceivePlan => ({
  id: 'plan-history-1',
  code: 'PLAN-HISTORY-1',
  status: 'DONE',
  plannedStart: '2024-11-10T08:00:00Z',
  plannedEnd: '2024-11-10T17:00:00Z',
  executionStart: '2024-11-12T09:00:00Z',
  executionEnd: '2024-11-12T16:00:00Z',
  equipmentBooked: true,
  portNotified: true,
  createdAt: '2024-11-09T10:00:00Z',
  updatedAt: '2024-11-12T17:00:00Z',
  containers:
    overrides.containers ||
    [
      {
        id: 'container-history-1',
        planId: 'plan-history-1',
        orderContainerId: 'oc-history-1',
        assignedAt: '2024-11-09T08:00:00Z',
        unassignedAt: null,
        status: 'REJECTED' as const,
        truckNo: null,
        receivedAt: null,
        rejectedAt: '2024-11-12T10:00:00Z',
        receivedType: 'NORMAL' as const,
        completed: true,
        notes: null,
        orderContainer: {
          id: 'oc-history-1',
          orderId: 'order-history-1',
          containerId: 'container-master-1',
          containerNo: 'MSCU1234567',
          sealNumber: 'SEAL-XYZ',
          yardFreeFrom: null,
          yardFreeTo: null,
          extractFrom: null,
          extractTo: null,
          isPriority: false,
          mblNumber: 'MBL-HISTORY-1',
          customsStatus: 'PENDING' as CustomsStatus,
          cargoReleaseStatus: 'PENDING' as CargoReleaseStatus,
          summary: { typeCode: '40HC' },
          hbls: [
            {
              id: 'hbl-history-1',
              orderContainerId: 'oc-history-1',
              hblId: 'hbl-history-1',
              hblNo: 'HBL-HISTORY-1',
            },
          ],
          bookingOrder: {
            id: 'order-history-1',
            code: 'ORD-HISTORY-1',
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

describe('DonePlanHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2024-11-18T10:00:00Z'));
    mockUseDonePlansHistory.mockReturnValue({
      data: buildResponse([buildPlan()]),
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders plans and expands container details with rejection highlight', async () => {
    const user = userEvent.setup();
    render(<DonePlanHistory />);

    expect(screen.getByText('PLAN-HISTORY-1')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /toggle containers for plan-history-1/i }),
    );

    expect(screen.getByText('MSCU1234567')).toBeInTheDocument();
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
  });
});
