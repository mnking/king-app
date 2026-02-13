export type Direction = 'IMPORT' | 'EXPORT';
export type ContainerPaymentStatus = 'PENDING' | 'DONE';

export interface OrderReference {
  bookingNumber?: string | null;
  exportPlanCode?: string | null;
}

export interface PrepayDeclaration {
  cargoStore: {
    enabled: boolean;
    days: number;
  };
}

export interface BillingChargeItem {
  id: string;
  description: string;
  amount: number;
}

export interface BillingPaymentRecord {
  id: string;
  actualAmount: number;
  note?: string | null;
  receiptNumber?: string | null;
  paidAt?: string | null;
}

export interface ContainerPayment {
  id: string; // container id in CFS order/plan
  entityRef: string; // billing entityRef
  direction: Direction;
  containerNumber: string | null;
  containerTypeCode?: string | null;
  sealNumber?: string | null;
  allowStuffingOrDestuffing?: boolean | null;
  forwarderId?: string | null;
  forwarderCode?: string | null;
  paymentStatus: ContainerPaymentStatus;
  orderReference?: OrderReference;
}
