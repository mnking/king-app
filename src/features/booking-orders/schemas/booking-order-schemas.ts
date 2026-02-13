import { z } from 'zod';
import { ContainerFormSchema } from './cargo-property-schemas';
import { getLocalTodayAsUtcMidnight } from '@/shared/utils/dateTimeUtils';

// ===========================
// Booking Order Validation Schemas
// ===========================

export const BookingOrderStatusEnum = z.enum(['DRAFT', 'APPROVED']);

// UUID validation helper (rejects empty strings)
const uuidSchema = z
  .string()
  .min(1, 'This field is required')
  .uuid('Invalid UUID format');

// ISO date validation helper (accepts YYYY-MM-DD or ISO datetime format)
const isoDateSchema = z
  .string()
  .min(1, 'Date is required')
  .refine(
    (val) => {
      // Accept YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
      // Accept ISO datetime format (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(val)) return true;
      return false;
    },
    {
      message: 'Invalid date format (expected YYYY-MM-DD or ISO datetime)',
    },
  );

// ===========================
// Draft Mode Schema (Relaxed Validation)
// ===========================

export const BookingOrderCreateSchema = z.object({
  agentId: uuidSchema,
  agentCode: z.string().optional(),     // Forwarder code (sent explicitly to backend)
  bookingNumber: z.string().nullable().optional(), // [v1.4] User-editable business identifier
  eta: isoDateSchema,
  vesselCode: z.string().min(1, 'Vessel name is required'),
  voyage: z.string().min(1, 'Voyage is required'),
  subVoyage: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  containers: z.array(ContainerFormSchema).optional(), // Validates each container
});

// ===========================
// Approval Mode Schema (Strict Validation)
// ===========================

export const BookingOrderApprovalSchema = BookingOrderCreateSchema.extend({
  containers: z
    .array(ContainerFormSchema)
    .min(1, 'At least one container is required for approval'),
});

// ===========================
// Update Schema (Partial Fields)
// ===========================

export const BookingOrderUpdateSchema = BookingOrderCreateSchema.partial();

// ===========================
// Default Form Values
// ===========================

export const bookingOrderDefaultValues = {
  agentId: '',
  agentCode: undefined,
  bookingNumber: null,
  eta: '',
  vesselCode: '',
  voyage: '',
  subVoyage: null,
  notes: null,
  containers: [],
};

export const createBookingOrderDefaultValues = () => ({
  ...bookingOrderDefaultValues,
  eta: getLocalTodayAsUtcMidnight(),
});

// ===========================
// Type Inference
// ===========================

export type BookingOrderCreateFormData = z.infer<typeof BookingOrderCreateSchema>;
export type BookingOrderApprovalFormData = z.infer<typeof BookingOrderApprovalSchema>;
export type BookingOrderUpdateFormData = z.infer<typeof BookingOrderUpdateSchema>;
