/**
 * Temporary mock data generators for on-hold management UI
 * These generators provide deterministic temporary data for development and testing
 * TODO: Replace with actual API calls when backend integration is complete
 */

import type {
  ContainerCustomsStatus,
  CargoCustomsStatus,
  OnHoldInformation,
  OnHoldHBLDetail,
  OnHoldCounts,
  HBLCargoLocation,
} from '../types/temp-onhold-types';

/**
 * Simple hash function for deterministic pseudo-random values
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Get temporary container customs status
 * Returns deterministic status based on container ID
 * TODO: Replace with: container.customsStatus (from API)
 */
export const getTempContainerCustomsStatus = (
  containerId: string,
): ContainerCustomsStatus => {
  const hash = hashString(containerId);
  const mod = hash % 5;

  // Distribution: 40% passed, 20% on_hold, 40% null
  if (mod === 0 || mod === 1) return 'passed';
  if (mod === 2) return 'on_hold';
  return null;
};

/**
 * Get temporary cargo customs status for HBL
 * Returns deterministic status based on HBL ID
 * TODO: Replace with: hbl.cargoCustomsStatus (from API)
 */
export const getTempCargoCustomsStatus = (hblId: string): CargoCustomsStatus => {
  const hash = hashString(hblId);
  // Distribution: 70% passed, 30% on_hold
  return hash % 10 < 7 ? 'passed' : 'on_hold';
};

/**
 * Get temporary on-hold information for a container
 * TODO: Replace with: GET /v1/plans/{planId}/containers/{containerId}/onhold-info
 */
export const getTempOnHoldInfo = (
  containerId: string,
  containerNumber: string,
  mblNumber?: string | null,
  forwarderName?: string | null,
): OnHoldInformation => {
  const hash = hashString(containerId);
  const dayOffset = hash % 7; // 0-6 days ago
  const checkingTime = new Date();
  checkingTime.setDate(checkingTime.getDate() - dayOffset);

  return {
    containerNumber,
    oldSealNumber: `SEAL${hash % 10000}`,
    newSealNumber: `NSEAL${(hash + 1) % 10000}`,
    mblNumber: mblNumber || null,
    forwarderName: forwarderName || null,
    checkingTime: checkingTime.toISOString(),
    notes: `Temporary hold for customs inspection. Container flagged for physical verification.`,
    documentUrl: null, // Placeholder
  };
};

/**
 * Get temporary on-hold HBL details
 * TODO: Replace with data from API response
 */
export const getTempOnHoldHBLDetails = (
  hblId: string,
  hblNumber: string,
): OnHoldHBLDetail => {
  const hash = hashString(hblId);
  const locations: HBLCargoLocation[] = ['restuffed', 'stored'];
  const location = locations[hash % 2];

  return {
    hblId,
    hblNumber,
    packingListNumber: `PL${hash % 100000}`,
    consignee: `Consignee ${String.fromCharCode(65 + (hash % 26))} Ltd`,
    location,
    notes: location === 'restuffed'
      ? 'Cargo restuffed into container for temporary storage'
      : 'Cargo stored in warehouse pending customs clearance',
    documentUrl: null, // Placeholder
  };
};

/**
 * Get temporary on-hold counts for a plan
 * TODO: Replace with: plan.onHoldContainerCount, plan.onHoldCargoCount (from API)
 */
export const getTempOnHoldCounts = (planId: string): OnHoldCounts => {
  const hash = hashString(planId);

  return {
    containers: hash % 3, // 0-2 containers on hold
    cargo: hash % 5, // 0-4 cargo items on hold
  };
};

/**
 * Log warning in development mode about temporary data usage
 */
export const logTempDataWarning = (context: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[TEMP DATA] ${context} - Using temporary placeholder data. Replace with API integration.`,
    );
  }
};
