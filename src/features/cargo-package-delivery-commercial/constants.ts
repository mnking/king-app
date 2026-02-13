import type { CommercialStatus } from './types';

export const FEE_ITEMS = [
  { name: 'Warehouse storage (1 day)', amount: 50 },
  { name: 'Cargo handling fee', amount: 80 },
  { name: 'Inland transport fee', amount: 180 },
  { name: 'Customs service fee', amount: 110 },
] as const;

export const FEE_TOTAL = FEE_ITEMS.reduce((sum, item) => sum + item.amount, 0);

export const defaultStatus: CommercialStatus = {
  paid: false,
  deliveryAllowed: false,
};
