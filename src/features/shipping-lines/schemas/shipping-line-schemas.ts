import { z } from 'zod';

// ===========================
// Shipping Line Validation Schemas
// ===========================

export const ShippingLineStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);
export const ShippingLineContractStatusEnum = z.enum(['N/A', 'ACTIVE', 'EXPIRED', 'SUSPENDED']);
export const ShippingLineTypeEnum = z.enum(['NORMAL']);

const ContractFileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string().optional(),
    url: z.string().url().optional(),
    sizeBytes: z.number().optional(),
  })
  .partial({ mimeType: true, url: true, sizeBytes: true });

export const ShippingLineCreateSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters/numbers only'),
  name: z
    .string()
    .min(1, 'Name is required'),
  type: ShippingLineTypeEnum,
  status: ShippingLineStatusEnum,
});

export const ShippingLineFormSchema = ShippingLineCreateSchema.extend({
  contactInfo: z.string().optional(),
  contractStatus: ShippingLineContractStatusEnum,
  contractExpireDate: z.string().optional(),
  contractFile: ContractFileSchema.nullish(),
  note: z.string().optional(),
}).superRefine((data, ctx) => {
  const needsExpiry =
    data.contractStatus?.toUpperCase() === 'ACTIVE' ||
    data.contractStatus?.toUpperCase() === 'SUSPENDED';
  if (needsExpiry && !data.contractExpireDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contractExpireDate'],
      message: 'Contract expiry date is required when contract status is Active or Suspended.',
    });
  }
});

export const ShippingLineUpdateSchema = ShippingLineCreateSchema.partial();

// Default form values
export const shippingLineDefaultValues = {
  code: '',
  name: '',
  type: 'NORMAL' as const,
  status: 'ACTIVE' as const,
};

export const shippingLineFormDefaultValues = {
  ...shippingLineDefaultValues,
  contactInfo: '',
  contractStatus: 'N/A' as const,
  contractExpireDate: '',
  note: '',
  contractFile: undefined,
};

// Status options for select fields
export const shippingLineStatusOptions = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
] as const;

export const shippingLineTypeOptions = [{ value: 'NORMAL', label: 'NORMAL' }] as const;

// Type inference
export type ShippingLineCreateFormData = z.infer<typeof ShippingLineCreateSchema>;
export type ShippingLineUpdateFormData = z.infer<typeof ShippingLineUpdateSchema>;
