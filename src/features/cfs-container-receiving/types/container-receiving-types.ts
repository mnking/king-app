import {
  CUSTOMS_REQUEST_STATUS,
  CUSTOMS_REQUEST_STATUS_LABELS,
  type CustomsRequestStatus,
} from '@/shared/constants/container-status';

export type { CustomsRequestStatus };

export { CUSTOMS_REQUEST_STATUS_LABELS };

export const CUSTOMS_REQUEST_STATUS_STEPS: CustomsRequestStatus[] = Object.values(
  CUSTOMS_REQUEST_STATUS,
);

export type ContainerPositionStatus =
  | 'UNKNOWN'
  | 'AT_PORT'
  | 'IN_YARD'
  | 'IN_CFS'
  | 'GATED_IN'
  | 'GATED_OUT'
  | 'ON_VESSEL'
  | 'ON_BARGE'
  | 'IN_CUSTOMS'
  | 'IN_MR'
  | 'SEIZED';

export const POSITION_STATUS_LABELS: Record<ContainerPositionStatus, string> = {
  UNKNOWN: 'No status',
  AT_PORT: 'Discharged',
  IN_YARD: 'Stored',
  IN_CFS: 'IN CFS',
  GATED_IN: 'Gated in',
  GATED_OUT: 'Gated out',
  ON_VESSEL: 'On vessel',
  ON_BARGE: 'On barge',
  IN_CUSTOMS: 'In customs',
  IN_MR: 'In M&R',
  SEIZED: 'Seized',
};
