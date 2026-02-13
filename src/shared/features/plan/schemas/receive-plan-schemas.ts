import { z } from 'zod';

// ===========================
// Plan Form Validation Schemas
// ===========================

/**
 * Plan Form Schema - Validates create/edit plan form
 *
 * Validation Rules (Phase 1):
 * - plannedStart: required ISO datetime string
 * - plannedEnd: required ISO datetime string (must be after plannedStart)
 * - equipmentBooked: boolean (default false)
 * - portNotified: boolean (default false)
 * - containerIds: array of strings (min length 1)
 */
export const PlanFormSchema = z
  .object({
    plannedStart: z.string().min(1, 'Planned start date is required'),
    plannedStartTime: z.string().min(1, 'Planned start time is required'),
    plannedEnd: z.string().min(1, 'Planned end date is required'),
    plannedEndTime: z.string().min(1, 'Planned end time is required'),
    equipmentBooked: z.boolean().default(false),
    portNotified: z.boolean().default(false),
    containerIds: z.array(z.string()),
  })
  .refine(
    (data) => {
      // Combine date and time, then compare
      const start = new Date(`${data.plannedStart}T${data.plannedStartTime}:00Z`);
      const end = new Date(`${data.plannedEnd}T${data.plannedEndTime}:00Z`);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['plannedEnd'],
    },
  );

/**
 * Default form values for creating a new plan
 */
export const planDefaultValues = {
  plannedStart: '',
  plannedStartTime: '',
  plannedEnd: '',
  plannedEndTime: '',
  equipmentBooked: false,
  portNotified: false,
  containerIds: [],
};

/**
 * Status options for plan filtering
 */
export const planStatusOptions = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'DONE', label: 'Done' },
] as const;

/**
 * Plan Header Form Schema - Validates header-only editing (inline edit mode)
 *
 * Validation Rules:
 * - plannedStart: required date string
 * - plannedStartTime: required time string
 * - plannedEnd: required date string
 * - plannedEndTime: required time string (must be after plannedStart)
 * - equipmentBooked: boolean (default false)
 * - portNotified: boolean (default false)
 *
 * Note: Does NOT include containerIds (container management is separate)
 */
export const PlanHeaderFormSchema = z
  .object({
    plannedStart: z.string().min(1, 'Planned start date is required'),
    plannedStartTime: z.string().min(1, 'Planned start time is required'),
    plannedEnd: z.string().min(1, 'Planned end date is required'),
    plannedEndTime: z.string().min(1, 'Planned end time is required'),
    equipmentBooked: z.boolean().default(false),
    portNotified: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // Combine date and time, then compare
      const start = new Date(`${data.plannedStart}T${data.plannedStartTime}:00Z`);
      const end = new Date(`${data.plannedEnd}T${data.plannedEndTime}:00Z`);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['plannedEnd'],
    },
  );

/**
 * Default form values for header-only editing
 */
export const planHeaderDefaultValues = {
  plannedStart: '',
  plannedStartTime: '',
  plannedEnd: '',
  plannedEndTime: '',
  equipmentBooked: false,
  portNotified: false,
};

// Type inference
export type PlanFormData = z.infer<typeof PlanFormSchema>;
export type PlanHeaderFormData = z.infer<typeof PlanHeaderFormSchema>;

