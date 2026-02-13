import { z } from 'zod';

// ===========================
// Forwarder Validation Schemas
// ===========================

export const ForwarderStatusEnum = z.enum(['Active', 'Inactive']);
export const ForwarderTypeEnum = z.enum(['Forwarder', 'NVOCC', 'NORMAL']);
export const ForwarderContractStatusEnum = z.enum(['N/A', 'ACTIVE', 'EXPIRED', 'SUSPENDED']);

const ContractFileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string().optional(),
    url: z.string().url().optional(),
    sizeBytes: z.number().optional(),
  })
  .partial({ mimeType: true, url: true, sizeBytes: true });

export const ForwarderCreateSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters/numbers only'),
  name: z
    .string()
    .min(1, 'Name is required'),
  type: ForwarderTypeEnum,
  status: ForwarderStatusEnum,
});

export const ForwarderFormSchema = ForwarderCreateSchema.extend({
  contactInfo: z.string().optional(),
  contractStatus: ForwarderContractStatusEnum,
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

export const ForwarderUpdateSchema = ForwarderCreateSchema.partial();

// Default form values
export const forwarderDefaultValues = {
  code: '',
  name: '',
  type: 'Forwarder' as const,
  status: 'Active' as const,
};

export const forwarderFormDefaultValues = {
  ...forwarderDefaultValues,
  contactInfo: '',
  contractStatus: 'N/A' as const,
  contractExpireDate: '',
  note: '',
  contractFile: undefined,
};

// Status options for select fields
export const forwarderStatusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
] as const;

export const forwarderTypeOptions = [
  { value: 'Forwarder', label: 'Forwarder' },
  { value: 'NVOCC', label: 'NVOCC' },
  { value: 'NORMAL', label: 'NORMAL' },
] as const;

// Type inference
export type ForwarderCreateFormData = z.infer<typeof ForwarderCreateSchema>;
export type ForwarderUpdateFormData = z.infer<typeof ForwarderUpdateSchema>;
