import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test';
import userEvent from '@testing-library/user-event';
import { ExportServiceOrderManagement } from '../ExportServiceOrderManagement';
import type { ExportServiceOrder } from '../../types';
import { useExportServiceOrders, useDeleteExportServiceOrder } from '../../hooks';
import { useForwarders } from '@/features/forwarder/hooks';
import { exportPlansApi } from '@/services/apiExportPlans';

vi.mock('../../hooks', () => ({
  useExportServiceOrders: vi.fn(),
  useDeleteExportServiceOrder: vi.fn(),
  exportServiceOrderQueryKeys: {
    lists: () => ['exportServiceOrders', 'list'],
  },
}));

vi.mock('@/features/forwarder/hooks', () => ({
  useForwarders: vi.fn(),
}));

vi.mock('@/services/apiExportPlans', () => ({
  exportPlansApi: {
    create: vi.fn(),
    createContainer: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../ExportServiceOrderFormModal', () => ({
  default: () => null,
}));

const useExportServiceOrdersMock = vi.mocked(useExportServiceOrders);
const useDeleteExportServiceOrderMock = vi.mocked(useDeleteExportServiceOrder);
const useForwardersMock = vi.mocked(useForwarders);
const exportPlansApiMock = vi.mocked(exportPlansApi);

const createMockOrder = (overrides: Partial<ExportServiceOrder> = {}): ExportServiceOrder => ({
  id: 'order-1',
  code: 'ESO-0001',
  planId: null,
  status: 'APPROVED',
  forwarderId: null,
  forwarderCode: 'FW-1',
  requestTime: null,
  bookingConfirmation: null,
  bookingContainers: [
    {
      containerTypeCode: '20GP',
      amount: 3,
    },
  ],
  approvedBy: null,
  approvedAt: null,
  packingLists: [],
  createdAt: '2025-01-10T10:00:00Z',
  updatedAt: '2025-01-10T10:00:00Z',
  ...overrides,
});

describe('ExportServiceOrderManagement - create stuffing plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useExportServiceOrdersMock.mockReturnValue({
      data: { results: [createMockOrder()], total: 1 },
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);
    useDeleteExportServiceOrderMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    useForwardersMock.mockReturnValue({
      data: { results: [] },
      isLoading: false,
    } as any);
    exportPlansApiMock.create.mockResolvedValue({ id: 'plan-1' } as any);
    exportPlansApiMock.createContainer.mockResolvedValue({} as any);
  });

  it('should not call createContainer when creating stuffing plan', async () => {
    const user = userEvent.setup();
    render(<ExportServiceOrderManagement />);

    await user.click(screen.getByText('Create Stuffing Plan'));

    await waitFor(() => {
      expect(exportPlansApiMock.create).toHaveBeenCalledOnce();
    });

    expect(exportPlansApiMock.createContainer).not.toHaveBeenCalled();
  });
});
