import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { ReactNode } from 'react';
import {
  useBookingOrders,
  useBookingOrder,
  useCreateBookingOrder,
  useUpdateBookingOrder,
  useDeleteBookingOrder,
  useApproveBookingOrder,
  bookingOrderQueryKeys,
} from '../use-booking-orders-query';
import { bookingOrdersApi } from '@/services/apiCFS';
import type { BookingOrder, BookingOrderCreateForm } from '../../types';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('@/services/apiCFS', () => ({
  bookingOrdersApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    approve: vi.fn(),
  },
}));

// Test data
const mockBookingOrder: BookingOrder = {
  id: 'order-123',
  code: 'BO-2025-001',
  status: 'DRAFT',
  agentId: 'agent-1',
  agentCode: 'AGT-001',
  vesselCode: 'VES-001',
  eta: '2025-02-01',
  voyage: 'V123',
  subVoyage: null,
  notes: null,
  containers: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const mockCreateData: BookingOrderCreateForm = {
  agentId: 'agent-1',
  agentCode: 'AGT-001',
  vesselCode: 'VES-001',
  eta: '2025-02-01',
  voyage: 'V123',
  subVoyage: null,
  notes: null,
  containers: [],
};

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('use-booking-orders-query', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useBookingOrders', () => {
    it('should fetch booking orders successfully', async () => {
      const mockOrders = [mockBookingOrder];
      vi.mocked(bookingOrdersApi.getAll).mockResolvedValue({
        data: { items: mockOrders, meta: { totalItems: 1, totalPages: 1 } },
      } as any);

      const { result } = renderHook(() => useBookingOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(bookingOrdersApi.getAll).toHaveBeenCalledWith({});
    });

    it('should pass query params to API', async () => {
      vi.mocked(bookingOrdersApi.getAll).mockResolvedValue({
        data: { items: [], meta: { totalItems: 0, totalPages: 0 } },
      } as any);

      const params = { page: 2, itemsPerPage: 20, status: 'DRAFT' };
      const { result } = renderHook(() => useBookingOrders(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bookingOrdersApi.getAll).toHaveBeenCalledWith(params);
    });

    it('should handle fetch error', async () => {
      vi.mocked(bookingOrdersApi.getAll).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useBookingOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 2000 });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useBookingOrder', () => {
    it('should fetch single booking order by ID', async () => {
      vi.mocked(bookingOrdersApi.getById).mockResolvedValue({
        data: mockBookingOrder,
      } as any);

      const { result } = renderHook(() => useBookingOrder('order-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBookingOrder);
      expect(bookingOrdersApi.getById).toHaveBeenCalledWith('order-123');
    });

    it('should not fetch when ID is empty', () => {
      const { result } = renderHook(() => useBookingOrder(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(bookingOrdersApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateBookingOrder (T010)', () => {
    it('should create booking order successfully', async () => {
      vi.mocked(bookingOrdersApi.create).mockResolvedValue({
        data: mockBookingOrder,
      } as any);

      const { result } = renderHook(() => useCreateBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockCreateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bookingOrdersApi.create).toHaveBeenCalledWith(mockCreateData);
      expect(toast.success).toHaveBeenCalledWith('Booking order created successfully');
    });

    it('should call toast success message on creation', async () => {
      vi.mocked(bookingOrdersApi.create).mockResolvedValue({
        data: mockBookingOrder,
      } as any);

      const { result } = renderHook(() => useCreateBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockCreateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Booking order created successfully');
    });

    it('should handle creation error', async () => {
      const error = new Error('Validation failed');
      vi.mocked(bookingOrdersApi.create).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockCreateData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Validation failed');
    });

    it('should show default error message when no error message provided', async () => {
      vi.mocked(bookingOrdersApi.create).mockRejectedValue(new Error());

      const { result } = renderHook(() => useCreateBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockCreateData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to create booking order');
    });
  });

  describe('useUpdateBookingOrder (T022/T025)', () => {
    it('should update booking order successfully', async () => {
      const updatedOrder = { ...mockBookingOrder, notes: 'Updated notes' };
      vi.mocked(bookingOrdersApi.update).mockResolvedValue({
        data: updatedOrder,
      } as any);

      const { result } = renderHook(() => useUpdateBookingOrder(), {
        wrapper: createWrapper(),
      });

      const updateData = { notes: 'Updated notes' };
      result.current.mutate({ id: 'order-123', data: updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bookingOrdersApi.update).toHaveBeenCalledWith('order-123', updateData);
      expect(toast.success).toHaveBeenCalledWith('Booking order updated successfully');
    });

    it('should handle partial updates', async () => {
      const updatedOrder = { ...mockBookingOrder, voyage: 'V456' };
      vi.mocked(bookingOrdersApi.update).mockResolvedValue({
        data: updatedOrder,
      } as any);

      const { result } = renderHook(() => useUpdateBookingOrder(), {
        wrapper: createWrapper(),
      });

      const partialData = { voyage: 'V456' };
      result.current.mutate({ id: 'order-123', data: partialData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bookingOrdersApi.update).toHaveBeenCalledWith('order-123', partialData);
    });

    it('should return updated order data', async () => {
      const updatedOrder = { ...mockBookingOrder, notes: 'test' };
      vi.mocked(bookingOrdersApi.update).mockResolvedValue({
        data: updatedOrder,
      } as any);

      const { result } = renderHook(() => useUpdateBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'order-123', data: { notes: 'test' } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedOrder);
    });

    it('should handle update error', async () => {
      const error = new Error('Cannot update approved order');
      vi.mocked(bookingOrdersApi.update).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'order-123', data: { notes: 'test' } });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Cannot update approved order');
    });

    it('should show default error message when no error message provided', async () => {
      vi.mocked(bookingOrdersApi.update).mockRejectedValue(new Error());

      const { result } = renderHook(() => useUpdateBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'order-123', data: { notes: 'test' } });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to update booking order');
    });
  });

  describe('useDeleteBookingOrder (T023)', () => {
    it('should delete booking order successfully', async () => {
      vi.mocked(bookingOrdersApi.delete).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('order-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bookingOrdersApi.delete).toHaveBeenCalledWith('order-123');
      expect(toast.success).toHaveBeenCalledWith('Booking order deleted successfully');
    });

    it('should return deleted order ID', async () => {
      vi.mocked(bookingOrdersApi.delete).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('order-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe('order-123');
    });

    it('should handle deletion error', async () => {
      const error = new Error('Cannot delete approved order');
      vi.mocked(bookingOrdersApi.delete).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('order-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Cannot delete approved order');
    });
  });

  describe('useApproveBookingOrder (T028)', () => {
    it('should approve booking order successfully', async () => {
      const approvedOrder = { ...mockBookingOrder, status: 'APPROVED' as const, code: 'BO-2025-001' };
      vi.mocked(bookingOrdersApi.approve).mockResolvedValue({
        data: approvedOrder,
      } as any);

      const { result } = renderHook(() => useApproveBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('order-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(bookingOrdersApi.approve).toHaveBeenCalledWith('order-123');
      expect(toast.success).toHaveBeenCalledWith('Booking order BO-2025-001 approved successfully');
    });

    it('should handle approval without order code', async () => {
      const approvedOrder = { ...mockBookingOrder, status: 'APPROVED' as const, code: null };
      vi.mocked(bookingOrdersApi.approve).mockResolvedValue({
        data: approvedOrder,
      } as any);

      const { result } = renderHook(() => useApproveBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('order-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Booking order N/A approved successfully');
    });

    it('should return approved order with updated status', async () => {
      const approvedOrder = { ...mockBookingOrder, status: 'APPROVED' as const };
      vi.mocked(bookingOrdersApi.approve).mockResolvedValue({
        data: approvedOrder,
      } as any);

      const { result } = renderHook(() => useApproveBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('order-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.status).toBe('APPROVED');
    });

    it('should handle approval error with validation failures', async () => {
      const error = new Error('Order must have at least one container');
      vi.mocked(bookingOrdersApi.approve).mockRejectedValue(error);

      const { result } = renderHook(() => useApproveBookingOrder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('order-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Order must have at least one container');
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(bookingOrderQueryKeys.all).toEqual(['bookingOrders']);
      expect(bookingOrderQueryKeys.lists()).toEqual(['bookingOrders', 'list']);
      expect(bookingOrderQueryKeys.list({ status: 'DRAFT' })).toEqual([
        'bookingOrders',
        'list',
        { status: 'DRAFT' },
      ]);
      expect(bookingOrderQueryKeys.details()).toEqual(['bookingOrders', 'detail']);
      expect(bookingOrderQueryKeys.detail('order-123')).toEqual([
        'bookingOrders',
        'detail',
        'order-123',
      ]);
    });
  });
});
