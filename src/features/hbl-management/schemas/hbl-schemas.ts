import { z } from 'zod';

// ===========================
// HBL Validation Schemas
// ===========================

// Validation regexes
// Container number validation: ISO 6346 format (4 letters + 7 digits)
const CONTAINER_NUMBER_REGEX = /^[A-Z]{4}[0-9]{7}$/;
// UN/LOCODE format (5 chars: 2 letters country + 3 letters location)
export const UN_LOCODE_PORT_CODE_REGEX = /^[A-Z]{2}[A-Z0-9]{3}$/;

// File metadata schema for document upload
const fileMetadataSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string(),
  })
  .nullable();

// HBL Container Schema
export const HBLContainerSchema = z.object({
  containerNumber: z
    .string()
    .regex(CONTAINER_NUMBER_REGEX, 'Invalid container number format (ISO 6346: 4 letters + 7 digits)'),
  containerTypeCode: z
    .string()
    .length(4, 'Container type code must be exactly 4 characters')
    .nullable(), // Allow null for unknown container type
  sealNumber: z
    .string()
    .regex(/^[A-Z0-9]+$/, 'Seal number must be alphanumeric') // TODO(i18n): translate validation message
    .optional()
    .or(z.literal('')),
});

// HBL Create Schema - No required validations for draft mode
// Mandatory fields will be validated on approve action
export const HBLCreateSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Z0-9-]+$/, 'HBL code must be alphanumeric or hyphen')
    .optional()
    .or(z.literal('')),
  receivedAt: z.string().datetime('Invalid ISO date format').optional().or(z.literal('')),
  mbl: z
    .string()
    .optional()
    .or(z.literal('')),
  eta: z.string().datetime('Invalid ISO date format').optional().or(z.literal('')),
  document: fileMetadataSchema,
  issuerId: z.string().uuid('Invalid forwarder ID').optional().or(z.literal('')),
  shipper: z
    .string()
    .optional()
    .or(z.literal('')),
  consignee: z
    .string()
    .optional()
    .or(z.literal('')),
  notifyParty: z
    .string()
    .optional()
    .or(z.literal('')),
  vesselName: z
    .string()
    .optional()
    .or(z.literal('')),
  voyageNumber: z
    .string()
    .optional()
    .or(z.literal('')),
  pol: z
    .string()
    .optional()
    .or(z.literal('')),
  pod: z
    .string()
    .optional()
    .or(z.literal('')),
  containers: z
    .array(HBLContainerSchema)
    .max(1, 'Maximum 1 container allowed for HBL')
    .optional()
    .default([]),
});

export const HBLUpdateSchema = HBLCreateSchema.partial();

// HBL Approval Schema - Strict validation for approval action
// All fields required per backend spec (DOC_HBL_Field_Spec.md)
export const HBLApprovalSchema = HBLUpdateSchema.required({
  code: true,
  receivedAt: true,
  issuerId: true,
  mbl: true,
  eta: true,
  consignee: true,
  vesselName: true,
  voyageNumber: true,
  containers: true,
})
  .superRefine((data, ctx) => {
    const requiredStringFields: Array<[keyof typeof data, string]> = [
      ['code', 'HBL No is required'],
      ['receivedAt', 'Received date is required'],
      ['mbl', 'MBL No is required'],
      ['eta', 'ETA is required'],
      ['issuerId', 'Forwarder is required'],
      ['consignee', 'Consignee is required'],
      ['vesselName', 'Vessel name is required'],
      ['voyageNumber', 'Voyage number is required'],
    ];

    requiredStringFields.forEach(([field, message]) => {
      const value = data[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: [field],
        });
      }
    });

    const container = data.containers?.[0];
    const hasContainerNumber =
      typeof container?.containerNumber === 'string' &&
      container.containerNumber.trim().length > 0;
    const hasSealNumber =
      typeof container?.sealNumber === 'string' &&
      container.sealNumber.trim().length > 0;

    if (!hasContainerNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Container number is required',
        path: ['containers', 0, 'containerNumber'],
      });
    }

    if (!hasSealNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Seal number is required',
        path: ['containers', 0, 'sealNumber'],
      });
    }
  });

// Default form values factory function
// IMPORTANT: Must be a function to create fresh instances and avoid reference sharing
export const getHblDefaultValues = () => ({
  code: '',
  receivedAt: new Date().toISOString(), // Generate fresh timestamp each time
  mbl: '',
  eta: '',
  document: null,
  issuerId: '',
  shipper: '',
  consignee: '',
  notifyParty: '',
  vesselName: '',
  voyageNumber: '',
  pol: '',
  pod: '',
  containers: [
    {
      containerId: null,
      containerNumber: '',
      containerTypeCode: null,
      sealNumber: '',
    },
  ], // Fresh array instance each time
});

// For backward compatibility - but components should use getHblDefaultValues()
export const hblDefaultValues = getHblDefaultValues();

// Type inference
export type HBLCreateFormData = z.infer<typeof HBLCreateSchema>;
export type HBLUpdateFormData = z.infer<typeof HBLUpdateSchema>;
export type HBLContainerFormData = z.infer<typeof HBLContainerSchema>;
export type HBLApprovalFormData = z.infer<typeof HBLApprovalSchema>;
