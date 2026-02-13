/**
 * Temporary types for on-hold management UI
 * These types match the expected future API schema
 * TODO: Replace with actual API types when backend integration is complete
 */

/**
 * Container customs status
 */
export type ContainerCustomsStatus = 'passed' | 'on_hold' | null;

/**
 * Cargo (HBL) customs status
 */
export type CargoCustomsStatus = 'passed' | 'on_hold';

/**
 * Location of HBL cargo when on hold
 */
export type HBLCargoLocation = 'restuffed' | 'stored';

/**
 * On-hold information for a container
 */
export interface OnHoldInformation {
  containerNumber: string;
  oldSealNumber: string | null;
  newSealNumber: string | null;
  mblNumber: string | null;
  forwarderName: string | null;
  checkingTime: string | null; // ISO datetime
  notes: string | null;
  documentUrl: string | null; // Placeholder for future document upload
}

/**
 * Detailed HBL on-hold information
 */
export interface OnHoldHBLDetail {
  hblId: string;
  hblNumber: string;
  packingListNumber: string | null;
  consignee: string | null;
  location: HBLCargoLocation;
  notes: string | null;
  documentUrl: string | null; // Placeholder for future document download
}

/**
 * On-hold counts for a plan
 */
export interface OnHoldCounts {
  containers: number;
  cargo: number;
}
