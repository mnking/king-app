export interface CargoCreateStepProps {
  packingListId: string;
  packageTransactionId: string;
  orderNumber?: string | null;
  readOnly?: boolean;
  onTransactionUpdated?: () => void | Promise<void>;
}
