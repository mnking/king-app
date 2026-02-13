import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { unplannedQueryKeys } from '@/shared/features/plan/query-keys';
import { bookingOrdersApi, type BookingOrderPlanUpdatePayload } from '@/services/apiCFS';
import type {
  BookingOrder,
  BookingOrderCreateForm,
  BookingOrderUpdateForm,
  BookingOrdersQueryParams,
} from '../types';

// Query Keys
export const bookingOrderQueryKeys = {
  all: ['bookingOrders'] as const,
  lists: () => [...bookingOrderQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...bookingOrderQueryKeys.lists(), filters] as const,
  details: () => [...bookingOrderQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingOrderQueryKeys.details(), id] as const,
};

// ===========================
// Query Hooks
// ===========================

/**
 * T016: Fetch booking orders with pagination, filtering, and sorting
 * No staleTime - always fetches fresh data on filter application
 */
export function useBookingOrders(params: BookingOrdersQueryParams = {}) {
  return useQuery({
    queryKey: bookingOrderQueryKeys.list(params),
    queryFn: async () => {
      const response = await bookingOrdersApi.getAll(params);
      return response.data;
    },
    retry: 1,
    placeholderData: keepPreviousData, // v5 syntax - keeps previous page visible while loading next
  });
}

/**
 * Fetch single booking order by ID
 */
interface UseBookingOrderOptions {
  enabled?: boolean;
  initialData?: BookingOrder;
  staleTime?: number;
  refetchOnMount?: boolean | 'always';
}

export function useBookingOrder(id: string, options?: UseBookingOrderOptions) {
  return useQuery({
    queryKey: bookingOrderQueryKeys.detail(id),
    queryFn: async () => {
      const response = await bookingOrdersApi.getById(id);
      return response.data;
    },
    staleTime: options?.staleTime ?? 0,
    retry: 1,
    enabled: options?.enabled ?? !!id,
    refetchOnMount: options?.refetchOnMount ?? true,
    initialData: options?.initialData,
  });
}

// ===========================
// Mutation Hooks
// ===========================

/**
 * T010: Create draft booking order
 */
export function useCreateBookingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BookingOrderCreateForm) => {
      const response = await bookingOrdersApi.create(data);
      return response.data;
    },
    onSuccess: (newOrder) => {
      // Invalidate and refetch booking orders lists
      queryClient.invalidateQueries({ queryKey: bookingOrderQueryKeys.lists() });

      // Set the detail query data for the new order
      queryClient.setQueryData(
        bookingOrderQueryKeys.detail(newOrder.id),
        newOrder,
      );

      // Show success toast
      toast.success('Booking order created successfully');
    },
    onError: (error: Error) => {
      // Show error toast with backend message
      toast.error(error.message || 'Failed to create booking order');
    },
  });
}

/**
 * T022: Update booking order (partial or full)
 */
export function useUpdateBookingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<BookingOrderUpdateForm>;
    }) => {
      const response = await bookingOrdersApi.update(id, data);
      return response.data;
    },
    onSuccess: (updatedOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(
        bookingOrderQueryKeys.detail(updatedOrder.id),
        updatedOrder,
      );

      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: bookingOrderQueryKeys.lists() });

      // Show success toast
      toast.success('Booking order updated successfully');
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error(error.message || 'Failed to update booking order');
    },
  });
}

/**
 * Update booking order plan (ETA + containers only, partial container fields)
 */
export function useUpdateBookingOrderPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: BookingOrderPlanUpdatePayload;
    }) => {
      const response = await bookingOrdersApi.updatePlan(id, data);
      return response.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(
        bookingOrderQueryKeys.detail(updatedOrder.id),
        updatedOrder,
      );
      queryClient.invalidateQueries({ queryKey: bookingOrderQueryKeys.lists() });
      toast.success('Booking order updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update booking order');
    },
  });
}

/**
 * T023: Delete booking order (only drafts)
 */
export function useDeleteBookingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await bookingOrdersApi.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: bookingOrderQueryKeys.detail(deletedId),
      });

      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: bookingOrderQueryKeys.lists() });

      // Show success toast
      toast.success('Booking order deleted successfully');
    },
    onError: (error: Error) => {
      // Show error toast (e.g., "Cannot delete approved order")
      toast.error(error.message || 'Failed to delete booking order');
    },
  });
}

/**
 * T028: Approve booking order with validation
 */
export function useApproveBookingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await bookingOrdersApi.approve(id);
      return response.data;
    },
    onSuccess: (approvedOrder) => {
      // Update specific order in cache
      queryClient.setQueryData(
        bookingOrderQueryKeys.detail(approvedOrder.id),
        approvedOrder,
      );

      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: bookingOrderQueryKeys.lists() });

      // Invalidate unplanned containers (containers become available for planning)
      queryClient.invalidateQueries({ queryKey: unplannedQueryKeys.all });

      // Show success toast with order code
      const orderCode = approvedOrder.code || 'N/A';
      toast.success(`Booking order ${orderCode} approved successfully`);
    },
    onError: (error: Error) => {
      // Show error toast with validation failures
      toast.error(error.message || 'Failed to approve booking order');
    },
  });
}

// ===========================
// Utility Hooks
// ===========================

/**
 * Utility hook for booking order-related queries
 */
export function useBookingOrderQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: bookingOrderQueryKeys.all }),
    invalidateLists: () =>
      queryClient.invalidateQueries({ queryKey: bookingOrderQueryKeys.lists() }),
    invalidateOrder: (id: string) =>
      queryClient.invalidateQueries({ queryKey: bookingOrderQueryKeys.detail(id) }),
    refetchAll: () =>
      queryClient.refetchQueries({ queryKey: bookingOrderQueryKeys.all }),
  };
}
