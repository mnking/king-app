/**
 * Container Status Constants
 * Defines customs clearance and cargo release status enums for container tracking
 */

// Customs Status Enum
export const CUSTOMS_STATUS = {
  NOT_REGISTERED: 'NOT_REGISTERED',
  REGISTERED: 'REGISTERED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  HAS_CCP: 'HAS_CCP',
  REJECTED: 'REJECTED',
} as const;

export type CustomsStatus = typeof CUSTOMS_STATUS[keyof typeof CUSTOMS_STATUS];

// Cargo Release Status Enum
export const CARGO_RELEASE_STATUS = {
  NOT_REQUESTED: 'NOT_REQUESTED',
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
} as const;

export type CargoReleaseStatus = typeof CARGO_RELEASE_STATUS[keyof typeof CARGO_RELEASE_STATUS];

// Customs Request Status Enum (container identification flow)
export const CUSTOMS_REQUEST_STATUS = {
  UNIDENTIFIED: 'UNIDENTIFIED',
  IDENTIFIED: 'IDENTIFIED',
  GOT_IN: 'GOT_IN',
  DESTUFF_APPROVED: 'DESTUFF_APPROVED',
} as const;

export type CustomsRequestStatus =
  typeof CUSTOMS_REQUEST_STATUS[keyof typeof CUSTOMS_REQUEST_STATUS];

// Customs Status Labels
// TODO(i18n): Replace with translation keys once i18n branch merges
export const CUSTOMS_STATUS_LABELS: Record<CustomsStatus, string> = {
  [CUSTOMS_STATUS.NOT_REGISTERED]: 'Not Registered',
  [CUSTOMS_STATUS.REGISTERED]: 'Registered',
  [CUSTOMS_STATUS.PENDING_APPROVAL]: 'Pending Approval',
  [CUSTOMS_STATUS.HAS_CCP]: 'Has CCP',
  [CUSTOMS_STATUS.REJECTED]: 'Rejected',
};

// Cargo Release Status Labels
// TODO(i18n): Replace with translation keys once i18n branch merges
export const CARGO_RELEASE_STATUS_LABELS: Record<CargoReleaseStatus, string> = {
  [CARGO_RELEASE_STATUS.NOT_REQUESTED]: 'Not Requested',
  [CARGO_RELEASE_STATUS.REQUESTED]: 'Requested',
  [CARGO_RELEASE_STATUS.APPROVED]: 'Approved',
};

// Customs Request Status Labels
// TODO(i18n): Replace with translation keys once i18n branch merges
export const CUSTOMS_REQUEST_STATUS_LABELS: Record<CustomsRequestStatus, string> = {
  [CUSTOMS_REQUEST_STATUS.UNIDENTIFIED]: 'Unidentified',
  [CUSTOMS_REQUEST_STATUS.IDENTIFIED]: 'Identified',
  [CUSTOMS_REQUEST_STATUS.GOT_IN]: 'Got-in',
  [CUSTOMS_REQUEST_STATUS.DESTUFF_APPROVED]: 'Destuff approved',
};
