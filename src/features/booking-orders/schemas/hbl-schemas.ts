import { z } from 'zod';

// ===========================
// HBL Validation Schemas
// ===========================

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid UUID format');

// ===========================
// HBL Summary Schema
// ===========================

// Expanded summary schema to include all display fields for HBL table
export const HBLSummarySchema = z.object({
  receivedAt: z.string().optional(),      // ISO date string from HBL
  issuerName: z.string().optional(),      // Forwarder name (not ID)
  shipper: z.string().optional(),         // Shipper company
  consignee: z.string().optional(),       // Consignee company (existing)
  pol: z.string().optional(),             // Port of Loading code
  pod: z.string().optional(),             // Port of Discharge code
  vesselName: z.string().optional(),      // Vessel name
  voyageNumber: z.string().optional(),    // Voyage number
  packages: z.number().int().positive().optional(), // Package count (existing)
});

// ===========================
// HBL Form Schema (Draft Mode)
// ===========================

export const HBLFormSchema = z.object({
  id: z.string().uuid().optional(), // For existing HBLs
  hblId: uuidSchema,
  hblNo: z.string().min(1, 'HBL code is required'), // Renamed from "HBL number"
  // Summary fields - all optional as they'll be auto-populated
  receivedAt: z.string().optional(),
  issuerName: z.string().optional(),
  shipper: z.string().optional(),
  consignee: z.string().optional(),
  pol: z.string().optional(),
  pod: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  packages: z.number().int().positive('Packages must be a positive integer').optional(),
});

// ===========================
// HBL Approval Schema (Approval Mode)
// ===========================

// No additional validation for approval mode beyond draft requirements
export const HBLApprovalSchema = HBLFormSchema;

// ===========================
// Default Form Values
// ===========================

export const hblDefaultValues = {
  hblId: '',
  hblNo: '',
  receivedAt: '',
  issuerName: '',
  shipper: '',
  consignee: '',
  pol: '',
  pod: '',
  vesselName: '',
  voyageNumber: '',
  packages: undefined,
};

// ===========================
// Type Inference
// ===========================

export type HBLFormData = z.infer<typeof HBLFormSchema>;
export type HBLApprovalData = z.infer<typeof HBLApprovalSchema>;
export type HBLSummaryData = z.infer<typeof HBLSummarySchema>;
