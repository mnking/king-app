import { z } from 'zod';
import type { CargoTypeCode, HblPackingListLineFormValues } from '../types';

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

const cargoTypeCodeSchema = z
  .union([
    z.literal('BN'),
    z.literal('GP'),
    z.literal('DG'),
    z.literal('OD'),
    z.literal('WD'),
    z.literal('DR'),
    z.literal('UD'),
    z.literal('MT'),
    z.literal('ED'),
    z.literal('EF'),
    z.literal('ER'),
    z.literal('ET'),
    z.literal('RF'),
    z.literal('RO'),
    z.literal('OG'),
    z.literal('OO'),
    z.literal('OW'),
    z.literal('UC'),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => (value === undefined ? null : value));

export const HblCargoLineFormSchema = z
  .object({
    commodityDescription: z
      .string()
      .min(1, 'Commodity description is required'),
    unitOfMeasure: z
      .string()
      .min(1, 'Unit of measure is required')
      .max(32, 'Must be at most 32 characters'),
    packageTypeCode: cargoTypeCodeSchema.refine(
      (value): value is CargoTypeCode => value !== null,
      {
        message: 'Package type is required',
      },
    ),
    quantity: z.number().min(0, 'Quantity must be positive'),
    numberOfPackages: z
      .number()
      .int()
      .min(1, 'Number of packages must be at least 1'),
    grossWeightKg: z.number().min(0, 'Weight must be positive'),
    volumeM3: z.number().min(0, 'Volume must be positive'),
    shipmarks: normalizeString(),
    imdg: boundedString(50),
  })
  .superRefine((data, ctx) => {
    if (data.packageTypeCode === 'DG' && !data.imdg) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'IMDG is required when package type is DG',
        path: ['imdg'],
      });
    }
  });

export type HblCargoLineFormSchemaType = z.infer<typeof HblCargoLineFormSchema>;

export const hblCargoLineDefaultValues: HblPackingListLineFormValues = {
  commodityDescription: '',
  unitOfMeasure: '',
  packageTypeCode: null,
  quantity: null,
  numberOfPackages: null,
  grossWeightKg: null,
  volumeM3: null,
  shipmarks: null,
  imdg: null,
};
