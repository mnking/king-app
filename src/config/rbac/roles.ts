// Canonical list of roles provided by the backend.
export const ROLES = [
  'admin',
  'default',
  'cfs_gate_staff',
  'cfs_wh_manager',
  'cfs_commercial',
  'cfs_planner',
  'cfs_wh_staff',
] as const;

export type Role = (typeof ROLES)[number];
