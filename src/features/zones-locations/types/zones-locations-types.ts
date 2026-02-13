// API Response Wrapper Types
export interface ApiResponse<T> {
  statusCode: number;
  data: T;
}

export interface PaginatedResponse<T> {
  results: T[];
  total: number;
}

// Zone Types
export interface Zone {
  id: string;
  code: string;
  name: string;
   type: 'RBS' | 'CUSTOM';
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// Location Types
export interface Location {
  id: string;
  zoneId: string;
  zoneName?: string | null;
  zoneCode?: string; // For display purposes
  zoneType: 'RBS' | 'CUSTOM';
  type?: 'RBS' | 'CUSTOM'; // legacy field; prefer zoneType
  rbsRow: string | null;
  rbsBay: string | null;
  rbsSlot: string | null;
  customLabel: string | null;
  locationCode: string;
  absoluteCode: string;
  displayCode: string;
  status: 'active' | 'inactive' | 'locked';
  packageCount?: number;
  packingListCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// Form Types
export interface ZoneCreateForm {
  code: string;
  name: string;
  type: 'RBS' | 'CUSTOM';
  description?: string;
  status: 'active' | 'inactive';
}

export interface ZoneUpdateForm {
  name?: string;
  type?: 'RBS' | 'CUSTOM';
  description?: string;
  status?: 'active' | 'inactive';
}

export interface LocationCreateFormRBS {
  zoneId: string;
  type: 'RBS';
  rbsRow: string;
  rbsBay: string;
  rbsSlot: string;
  status: 'active' | 'inactive' | 'locked';
}

export interface LocationCreateFormCustom {
  zoneId: string;
  type: 'CUSTOM';
  customLabel: string;
  status: 'active' | 'inactive' | 'locked';
}

export type LocationCreateForm =
  | LocationCreateFormRBS
  | LocationCreateFormCustom;

export interface LocationUpdateForm {
  type?: 'RBS' | 'CUSTOM';
  rbsRow?: string;
  rbsBay?: string;
  rbsSlot?: string;
  customLabel?: string;
  status?: 'active' | 'inactive' | 'locked';
}

export interface LocationLayoutRequest {
  layout: {
    rows: Array<{
      bays: Array<{
        slotsCount: number;
      }>;
    }>;
  };
}

export interface LocationLayoutAssignment {
  rowIndex: number;
  bayIndex: number;
  slotIndex: number;
  assignedCode: string;
}

export interface LocationLayoutResponse {
  created: Location[];
  assignments: LocationLayoutAssignment[];
}

// Status Types
export type ZoneStatus = 'active' | 'inactive';
export type LocationStatus = 'active' | 'inactive' | 'locked';
export type LocationType = 'RBS' | 'CUSTOM';
export type ZoneType = 'RBS' | 'CUSTOM';

// Type Guards
export function isRBSLocation(
  location: Location,
): location is Location & { zoneType: 'RBS' } {
  return (location.zoneType || location.type) === 'RBS';
}

export function isCustomLocation(
  location: Location,
): location is Location & { zoneType: 'CUSTOM' } {
  return (location.zoneType || location.type) === 'CUSTOM';
}

export function isRBSForm(
  form: LocationCreateForm,
): form is LocationCreateFormRBS {
  return form.type === 'RBS';
}

export function isCustomForm(
  form: LocationCreateForm,
): form is LocationCreateFormCustom {
  return form.type === 'CUSTOM';
}
