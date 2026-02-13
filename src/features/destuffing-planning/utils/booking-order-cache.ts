import { getBookingOrderById } from '@/services/apiCFS';
import type { BookingOrder } from '@/features/booking-orders/types';

const BOOKING_ORDER_CACHE_TTL_MS = 5 * 60 * 1000;

type BookingOrderCacheEntry = {
  expiresAt: number;
  value?: BookingOrder | null;
  promise?: Promise<BookingOrder | null>;
};

const bookingOrderCache = new Map<string, BookingOrderCacheEntry>();

const isEntryValid = (entry: BookingOrderCacheEntry | undefined): boolean =>
  Boolean(entry) && Date.now() < entry.expiresAt;

export const clearBookingOrderCache = (): void => {
  bookingOrderCache.clear();
};

export const getCachedBookingOrderById = (
  orderId?: string | null,
): Promise<BookingOrder | null> => {
  if (!orderId) {
    return Promise.resolve(null);
  }

  const cached = bookingOrderCache.get(orderId);
  if (cached && isEntryValid(cached)) {
    if (cached.value !== undefined) {
      return Promise.resolve(cached.value);
    }
    if (cached.promise) {
      return cached.promise;
    }
  }

  const expiresAt = Date.now() + BOOKING_ORDER_CACHE_TTL_MS;
  const request = getBookingOrderById(orderId)
    .then((response) => {
      const value = response.data ?? null;
      bookingOrderCache.set(orderId, { value, expiresAt });
      return value;
    })
    .catch((error) => {
      console.warn(`Failed to fetch booking order ${orderId}:`, error);
      bookingOrderCache.delete(orderId);
      return null;
    });

  bookingOrderCache.set(orderId, { promise: request, expiresAt });
  return request;
};

export const getCachedBookingOrdersByIds = async (
  orderIds: Array<string | null | undefined>,
): Promise<Map<string, BookingOrder>> => {
  const uniqueOrderIds = [...new Set(orderIds.filter((id): id is string => Boolean(id)))];
  if (uniqueOrderIds.length === 0) {
    return new Map();
  }

  const orders = await Promise.all(
    uniqueOrderIds.map((orderId) => getCachedBookingOrderById(orderId)),
  );
  const orderMap = new Map<string, BookingOrder>();
  uniqueOrderIds.forEach((orderId, index) => {
    const order = orders[index];
    if (order) {
      orderMap.set(orderId, order);
    }
  });

  return orderMap;
};

export const enrichPlanWithBookingOrders = async <T extends { containers?: any[] }>(
  plan: T,
): Promise<T> => {
  const orderIds = (plan.containers ?? []).map(
    (container) => container?.orderContainer?.orderId ?? null,
  );
  const bookingOrdersById = await getCachedBookingOrdersByIds(orderIds);

  return {
    ...plan,
    containers: (plan.containers ?? []).map((container) => {
      const orderId = container?.orderContainer?.orderId;
      if (!orderId) {
        return container;
      }

      const bookingOrder = bookingOrdersById.get(orderId);
      if (!bookingOrder) {
        return container;
      }

      const existingBookingOrder = container.orderContainer?.bookingOrder;
      return {
        ...container,
        orderContainer: {
          ...container.orderContainer,
          bookingOrder: {
            id: bookingOrder.id,
            code: bookingOrder.code ?? existingBookingOrder?.code ?? null,
            bookingNumber:
              bookingOrder.bookingNumber ?? existingBookingOrder?.bookingNumber ?? null,
            agentId: bookingOrder.agentId ?? existingBookingOrder?.agentId ?? null,
            agentCode: bookingOrder.agentCode ?? existingBookingOrder?.agentCode ?? null,
          },
        },
      };
    }),
  };
};
