export type ContainerStageKey =
  | 'UNKNOWN'
  | 'ON_VESSEL'
  | 'AT_PORT'
  | 'GATED_IN'
  | 'IN_YARD'
  | 'IN_CFS'
  | 'IN_MR'
  | 'ON_BARGE'
  | 'GATED_OUT'
  | 'IN_CUSTOMS'
  | 'SEIZED';

export type StageEntryDetail = {
  label?: string;
  timestamp?: string;
};

export interface ReturnTransition {
  from: ContainerStageKey;
  to: ContainerStageKey;
  label?: string;
  timestamp?: string;
}

export const CONTAINER_STAGE_ORDER: ContainerStageKey[] = [
  'UNKNOWN',
  'GATED_IN',
  'ON_VESSEL',
  'AT_PORT',
  'IN_YARD',
  'IN_CFS',
  'IN_MR',
  'ON_BARGE',
  'IN_CUSTOMS',
  'GATED_OUT',
  'SEIZED',
];

export const CONTAINER_SIMPLE_STAGE_ORDER: ContainerStageKey[] = [
  'AT_PORT',
  'IN_YARD',
  'IN_CFS',
  'GATED_OUT',
];
