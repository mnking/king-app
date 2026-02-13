import { z } from 'zod';
import type { PackingListFormValues } from '../types';

const normalizeString = () =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === undefined || value === null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    });

const boundedString = (maxLength: number) =>
  normalizeString().refine((value) => value === null || value.length <= maxLength, {
    message: `Must be at most ${maxLength} characters`,
  });

const numberOrNull = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

const integerOrNull = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) && Number.isFinite(value) ? value : null;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && Number.isFinite(parsed) ? parsed : null;
  });

const directionFlowSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
  },
  z.union([z.enum(['IMPORT', 'EXPORT']), z.null()]),
);

const fileMetadataSchema = z
  .object({
    id: z.string(),
    name: normalizeString(),
    mimeType: normalizeString(),
    url: normalizeString(),
    sizeBytes: z.number().nullish(),
  })
  .nullable();

export const PackingListFormSchema = z.object({
  hblId: normalizeString(),
  packingListNumber: boundedString(50),
  mbl: normalizeString(),
  eta: normalizeString(),
  ata: normalizeString(),
  directionFlow: directionFlowSchema,
  note: normalizeString(),
  workPackingListFile: fileMetadataSchema,
  officialPackingListFile: fileMetadataSchema,
  forwarderId: normalizeString(),
  weight: numberOrNull,
  volume: numberOrNull,
  numberOfPackages: integerOrNull,
});

export type PackingListFormSchemaType = z.infer<typeof PackingListFormSchema>;

export const packingListDefaultValues: PackingListFormValues = {
  hblId: null,
  packingListNumber: null,
  mbl: null,
  eta: null,
  ata: null,
  directionFlow: null,
  note: null,
  workPackingListFile: null,
  officialPackingListFile: null,
  forwarderId: null,
  weight: null,
  volume: null,
  numberOfPackages: null,
  cargoLines: [],
};

const NON_UPLOAD_FIELDS: Array<keyof PackingListFormSchemaType> = [
  'hblId',
  'packingListNumber',
  'mbl',
  'eta',
  'ata',
  'directionFlow',
  'note',
  'forwarderId',
  'weight',
  'volume',
  'numberOfPackages',
];

export interface ValidationResult {
  valid: boolean;
  data?: PackingListFormSchemaType;
  fieldErrors?: Record<keyof PackingListFormSchemaType | '_root', string>;
}

const baseValidation = (
  values: PackingListFormValues,
): { success: boolean; data?: PackingListFormSchemaType; error?: z.ZodError } => {
  const result = PackingListFormSchema.safeParse(values);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
};

export const validateDraft = (values: PackingListFormValues): ValidationResult => {
  const result = baseValidation(values);
  if (!result.success || !result.data) {
    const fieldErrors: Record<keyof PackingListFormSchemaType | '_root', string> =
      {};
    result.error?.issues.forEach((issue) => {
      const pathKey = (issue.path[0] ?? '_root') as
        | keyof PackingListFormSchemaType
        | '_root';
      fieldErrors[pathKey] = issue.message;
    });
    return { valid: false, fieldErrors };
  }

  const hasInput = NON_UPLOAD_FIELDS.some((field) => {
    const value = result.data?.[field];
    if (value === null) return false;
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null;
  });

  if (!hasInput) {
    return {
      valid: false,
      data: result.data,
      fieldErrors: {
        _root: 'Enter at least one field before saving as draft.',
      },
    };
  }

  return { valid: true, data: result.data };
};

export const validatePartial = (
  values: PackingListFormValues,
): ValidationResult => {
  const result = validateDraft(values);
  if (!result.valid || !result.data) {
    return result;
  }

  const data = result.data;
  const fieldErrors: Record<keyof PackingListFormSchemaType | '_root', string> =
    {};

  if (!data.directionFlow) {
    fieldErrors.directionFlow = 'Direction flow is required';
  }

  if (!data.forwarderId) {
    fieldErrors.forwarderId = 'Forwarder is required';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, data, fieldErrors };
  }

  return { valid: true, data };
};

export const validateApprove = (
  values: PackingListFormValues,
): ValidationResult => {
  const result = validatePartial(values);
  if (!result.valid || !result.data) {
    return result;
  }

  const data = result.data;
  const fieldErrors: Record<keyof PackingListFormSchemaType | '_root', string> =
    {};

  if (!data.directionFlow) {
    fieldErrors.directionFlow = 'Direction flow is required';
  }

  const requiredFields: Array<keyof PackingListFormSchemaType> = [
    'packingListNumber',
    'mbl',
    'eta',
    // 'officialPackingListFile',
    'weight',
    'volume',
  ];

  requiredFields.forEach((field) => {
    const value = data[field];
    if (value === null || value === undefined || value === '') {
      fieldErrors[field] = 'This field is required for approval';
    }
  });

  if (data.weight !== null && data.weight <= 0) {
    fieldErrors.weight = 'Weight must be greater than 0';
  }
  if (data.volume !== null && data.volume <= 0) {
    fieldErrors.volume = 'Volume must be greater than 0';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, data, fieldErrors };
  }

  return { valid: true, data };
};
