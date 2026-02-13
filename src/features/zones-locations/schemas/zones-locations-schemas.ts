import { z } from 'zod';

// Zone Status Enum
export const ZoneStatusEnum = z.enum(['active', 'inactive']);

// Location Status Enum
export const LocationStatusEnum = z.enum(['active', 'inactive', 'locked']);

// Location Type Enum
export const LocationTypeEnum = z.enum(['RBS', 'CUSTOM']);
export const ZoneTypeEnum = LocationTypeEnum;

// Zone Schemas
export const ZoneBaseSchema = z.object({
  code: z
    .string()
    .min(1, 'Zone code is required')
    .max(2, 'Zone code must be 1-2 characters')
    .regex(/^[A-Z]{1,2}$/, 'Zone code must be 1-2 uppercase letters')
    .trim(),
  name: z
    .string()
    .min(1, 'Zone name is required')
    .max(100, 'Zone name must not exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  status: ZoneStatusEnum,
  type: ZoneTypeEnum,
});

export const ZoneCreateSchema = ZoneBaseSchema;

export const ZoneUpdateSchema = ZoneBaseSchema.partial().omit({ code: true });

// Location Schemas
export const LocationBaseSchema = z.object({
  zoneId: z.string().min(1, 'Zone is required'),
  type: LocationTypeEnum,
  status: LocationStatusEnum,
});

// RBS-specific schema
export const RBSLocationSchema = LocationBaseSchema.extend({
  type: z.literal('RBS'),
  rbsRow: z
    .string()
    .min(1, 'Row is required')
    .regex(/^R\d{2,}$/, 'Row must be in format R01, R02, etc.')
    .trim(),
  rbsBay: z
    .string()
    .min(1, 'Bay is required')
    .regex(/^B\d{2,}$/, 'Bay must be in format B01, B02, etc.')
    .trim(),
  rbsSlot: z
    .string()
    .min(1, 'Slot is required')
    .regex(/^S\d{2,}$/, 'Slot must be in format S01, S02, etc.')
    .trim(),
});

// Custom location schema
export const CustomLocationSchema = LocationBaseSchema.extend({
  type: z.literal('CUSTOM'),
  customLabel: z
    .string()
    .min(1, 'Location label is required')
    .max(20, 'Location label must not exceed 20 characters')
    .regex(
      /^[A-Z0-9]+$/,
      'Label must contain only uppercase letters and numbers',
    )
    .trim(),
});

// Discriminated union for location creation
export const LocationCreateSchema = z.discriminatedUnion('type', [
  RBSLocationSchema,
  CustomLocationSchema,
]);

// Location update schema (partial)
export const LocationUpdateSchema = z.object({
  type: LocationTypeEnum.optional(),
  rbsRow: z
    .string()
    .regex(/^R\d{2,}$/, 'Row must be in format R01, R02, etc.')
    .trim()
    .optional(),
  rbsBay: z
    .string()
    .regex(/^B\d{2,}$/, 'Bay must be in format B01, B02, etc.')
    .trim()
    .optional(),
  rbsSlot: z
    .string()
    .regex(/^S\d{2,}$/, 'Slot must be in format S01, S02, etc.')
    .trim()
    .optional(),
  customLabel: z
    .string()
    .max(20, 'Location label must not exceed 20 characters')
    .regex(
      /^[A-Z0-9]+$/,
      'Label must contain only uppercase letters and numbers',
    )
    .trim()
    .optional(),
  status: LocationStatusEnum.optional(),
});

// TypeScript types inferred from Zod schemas
export type ZoneStatus = z.infer<typeof ZoneStatusEnum>;
export type LocationStatus = z.infer<typeof LocationStatusEnum>;
export type LocationType = z.infer<typeof LocationTypeEnum>;
export type ZoneType = z.infer<typeof ZoneTypeEnum>;
export type ZoneCreateForm = z.infer<typeof ZoneCreateSchema>;
export type ZoneUpdateForm = z.infer<typeof ZoneUpdateSchema>;
export type LocationCreateForm = z.infer<typeof LocationCreateSchema>;
export type LocationUpdateForm = z.infer<typeof LocationUpdateSchema>;

// Default values for forms
export const zoneFormDefaults: Partial<ZoneCreateForm> = {
  code: '',
  name: '',
  description: '',
  status: 'active',
  type: 'RBS',
};

export const locationFormDefaults = {
  RBS: {
    type: 'RBS' as const,
    status: 'inactive' as const,
    rbsRow: 'R01',
    rbsBay: 'B01',
    rbsSlot: 'S01',
  },
  CUSTOM: {
    type: 'CUSTOM' as const,
    status: 'inactive' as const,
    customLabel: '',
  },
};

// Options for select fields
export const zoneStatusOptions: Array<{ value: ZoneStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const locationStatusOptions: Array<{
  value: LocationStatus;
  label: string;
}> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'locked', label: 'Locked' },
];

export const locationTypeOptions: Array<{
  value: LocationType;
  label: string;
}> = [
  { value: 'RBS', label: 'Row-Bay-Slot (RBS)' },
  { value: 'CUSTOM', label: 'Custom Label' },
];

export const zoneTypeOptions: Array<{ value: ZoneType; label: string }> = [
  { value: 'RBS', label: 'Row-Bay-Slot (RBS)' },
  { value: 'CUSTOM', label: 'Custom Label' },
];
