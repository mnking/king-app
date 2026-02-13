import { z } from 'zod';
import type { PackingListLineFormValues } from '../types';

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

export const PackingListLineFormSchema = z.object({
  commodityDescription: z
    .string()
    .min(1, 'Commodity description is required'),
  unitOfMeasure: z
    .string()
    .min(1, 'Unit of measure is required')
    .max(32, 'Must be at most 32 characters'),
  packageTypeCode: z
    .string()
    .min(1, 'Package type is required')
    .max(32, 'Must be at most 32 characters'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  numberOfPackages: z.number().int().min(1, 'Number of packages must be at least 1'),
  grossWeightKg: z.number().min(0, 'Weight must be positive'),
  volumeM3: z.number().min(0, 'Volume must be positive'),
  shipmarks: z
    .string()
    .min(1, 'Shipmarks is required'),
  imdg: boundedString(50),
}).superRefine((data, ctx) => {
  if (data.packageTypeCode.trim().toUpperCase() === 'DG' && !data.imdg) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'IMDG is required when package type is DG',
      path: ['imdg'],
    });
  }
});

export type PackingListLineFormSchemaType = z.infer<
  typeof PackingListLineFormSchema
>;

export const packingListLineDefaultValues: PackingListLineFormValues = {
  commodityDescription: '',
  unitOfMeasure: '',
  packageTypeCode: '',
  quantity: null,
  numberOfPackages: null,
  grossWeightKg: null,
  volumeM3: null,
  shipmarks: null,
  imdg: null,
};
