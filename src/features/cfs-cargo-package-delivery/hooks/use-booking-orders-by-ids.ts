import { useQuery } from '@tanstack/react-query';
import { bookingOrdersApi } from '@/services/apiCFS';

type BookingOrderCodeMap = Record<string, string | null>;

export function useBookingOrdersByIds(orderIds: string[]) {
  const normalizedIds = Array.from(new Set(orderIds.filter(Boolean)));

  return useQuery<BookingOrderCodeMap>({
    queryKey: ['booking-orders-by-ids', normalizedIds.sort()],
    enabled: normalizedIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        normalizedIds.map(async (orderId) => {
          try {
            const response = await bookingOrdersApi.getById(orderId);
            return [orderId, response.data?.code ?? null] as const;
          } catch {
            return [orderId, null] as const;
          }
        }),
      );

      return Object.fromEntries(entries);
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
}
