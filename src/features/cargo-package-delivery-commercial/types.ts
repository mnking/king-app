import type { Forwarder } from '@/features/forwarder/types';

export type CommercialStatus = {
  paid: boolean;
  deliveryAllowed: boolean;
  deliveryDate?: string | null;
  paidAt?: string;
  total?: number;
};

export type CommercialStatusMap = Record<string, CommercialStatus>;

export type ForwarderLookup = {
  getForwarderDisplay: (issuerId: string) => string;
  getForwarder: (issuerId: string) => Forwarder | undefined;
};

export type HblBillingCalculationRequest = {
  hblId: string;
  importMoves?: number;
  exportMoves?: number;
  deliveryDate?: string;
};

export type StorageBreakdown = {
  startDay: number;
  endDay: number;
  days: number;
  unitPrice: number;
  rt: number;
  amount: number;
};

export type HandlingBreakdown = {
  direction: string;
  moves: number;
  unitPrice: number;
  rt: number;
  amount: number;
};

export type VasBreakdown = {
  packingListLineId?: string;
  code: string;
  description: string;
  unit: string;
  events: number;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type BillingLineItem = {
  packingListLineId?: string;
  cargoType: string;
  rt: number;
  storageTotal: number;
  handlingTotal: number;
  vasTotal: number;
  totalAmount: number;
  storageBreakdown: StorageBreakdown[];
  handlingBreakdown: HandlingBreakdown[];
  vasBreakdown: VasBreakdown[];
};

export type HblBillingCalculationResponse = {
  currency: string;
  cargoType: string;
  rt: number;
  storageTotal: number;
  handlingTotal: number;
  vasTotal: number;
  totalAmount: number;
  lineItems: BillingLineItem[];
};

export type BillingCalculationMap = Record<string, HblBillingCalculationResponse>;
