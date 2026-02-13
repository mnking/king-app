import * as bookingApi from '@/services/apiCFS';
import * as forwarderApi from '@/services/apiForwarder';
import type { BookingOrder } from '@/features/booking-orders/types';
import type {
  UnplannedContainer,
  EnrichedUnplannedContainer,
  EnrichedHBLData,
} from '../types';

type BookingOrderFetcher = (orderId: string) => Promise<BookingOrder | null>;

/**
 * Enrich containers with booking order and HBL data
 *
 * @param containers - Array of unplanned containers to enrich
 * @returns Promise of enriched containers with booking order details and HBL data
 */
export async function enrichContainers(
  containers: UnplannedContainer[],
  options?: { getBookingOrderById?: BookingOrderFetcher },
): Promise<EnrichedUnplannedContainer[]> {
  // 1. Extract unique order IDs and HBL IDs
  const uniqueOrderIds = [
    ...new Set(
      containers
        .map((container) => container.orderId)
        .filter((orderId): orderId is string => Boolean(orderId)),
    ),
  ];
  const uniqueHblIds = [
    ...new Set(
      containers
        .flatMap((container) => container.hbls?.map((hbl) => hbl.hblId) || [])
        .filter((hblId): hblId is string => Boolean(hblId)),
    ),
  ];
  const fetchBookingOrder =
    options?.getBookingOrderById ??
    (async (orderId: string) => {
      const orderResponse = await bookingApi.getBookingOrderById(orderId);
      return orderResponse.data ?? null;
    });

  // 2. Fetch booking orders and HBLs in parallel
  const [orders, hbls] = await Promise.all([
    // Fetch all booking orders
    Promise.all(
      uniqueOrderIds.map(async (orderId) => {
        try {
          return await fetchBookingOrder(orderId);
        } catch (error) {
          console.warn(`Failed to fetch booking order ${orderId}:`, error);
          return null;
        }
      }),
    ),
    // Fetch all HBLs
    Promise.all(
      uniqueHblIds.map(async (hblId) => {
        try {
          const hblResponse = await forwarderApi.hblsApi.getById(hblId);
          return hblResponse.data;
        } catch (error) {
          console.warn(`Failed to fetch HBL ${hblId}:`, error);
          return null;
        }
      }),
    ),
  ]);

  // 3. Create lookup maps (filter out nulls from failed fetches)
  const orderMap = new Map(orders.filter((o) => o !== null).map((o) => [o!.id, o!]));
  const hblMap = new Map(hbls.filter((h) => h !== null).map((h) => [h!.id, h!]));

  // 4. Enrich containers with booking order and HBL data
  const enrichedContainers: EnrichedUnplannedContainer[] = containers.map((container) => {
    const bookingOrder = container.orderId ? orderMap.get(container.orderId) : undefined;

    // Enrich HBLs with container type info
    const enrichedHbls: EnrichedHBLData[] | undefined = container.hbls?.map((hbl) => {
      const fullHbl = hblMap.get(hbl.hblId);
      return {
        id: hbl.hblId,
        hblNo: hbl.hblNo,
        containerNumber: fullHbl?.containers?.[0]?.containerNumber,
        containerTypeCode: fullHbl?.containers?.[0]?.containerTypeCode,
      };
    });

    const matchingContainer = bookingOrder?.containers?.find(
      (orderContainer) => orderContainer.id === container.id,
    );

    return {
      ...container,
      containerStatus:
        container.containerStatus ?? matchingContainer?.containerStatus,
      customsRequestStatus:
        container.customsRequestStatus ?? matchingContainer?.customsRequestStatus,
      cargoReleaseStatus:
        container.cargoReleaseStatus ?? matchingContainer?.cargoReleaseStatus,
      bookingOrder: bookingOrder
        ? {
            id: bookingOrder.id,
            agentId: bookingOrder.agentId,
            code: bookingOrder.code,
            bookingNumber: bookingOrder.bookingNumber ?? null,
            agentCode: bookingOrder.agentCode,
            eta: bookingOrder.eta,
            ata: bookingOrder.ata ?? null,
            vesselCode: bookingOrder.vesselCode,
            voyage: bookingOrder.voyage,
          }
        : undefined,
      enrichedHbls,
      atYard: container.summary?.is_atyard ?? false,
    };
  });

  return enrichedContainers;
}
