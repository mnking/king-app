import type { ExportCargoReceivingServiceOrder } from '../types';

export const buildServiceOrderLookup = (
  orders: ExportCargoReceivingServiceOrder[],
) => {
  const lookup = new Map<string, string>();
  orders.forEach((order) => {
    (order.packingLists ?? []).forEach((row) => {
      if (!row.packingListId) return;
      if (!lookup.has(row.packingListId)) {
        lookup.set(row.packingListId, order.code ?? order.id);
      }
    });
  });
  return lookup;
};
