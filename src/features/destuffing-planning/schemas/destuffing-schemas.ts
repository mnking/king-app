import { z } from 'zod';

const hblSelectionSchema = z.object({
  hblId: z.string(),
  hblCode: z.string(),
  packingListNo: z.string().nullable().optional(),
});

const parsePlannedDateTime = (dateTime: string, time?: string): Date | null => {
  const source = dateTime.includes('T')
    ? dateTime
    : time
      ? `${dateTime}T${time}`
      : dateTime;
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Validation schema for creating destuffing plans.
 * Mirrors receive plan schema but locks planType to DESTUFFING.
 */
export const createDestuffingPlanSchema = z
  .object({
    planType: z.literal('DESTUFFING').default('DESTUFFING'),
    forwarderId: z.string().min(1, 'Forwarder is required'),
    plannedStart: z.string().min(1, 'Planned start date and time is required'),
    plannedStartTime: z.string().optional().default(''),
    plannedEnd: z.string().min(1, 'Planned end date and time is required'),
    plannedEndTime: z.string().optional().default(''),
    equipmentBooked: z.boolean().default(false),
    approvedAppointment: z.boolean().default(false),
    containerIds: z
      .array(z.string(), {
        required_error: 'Select at least one container.',
      })
      .min(1, 'Select at least one container.'),
    hblSelections: z.record(z.array(hblSelectionSchema)).default({}),
  })
  .superRefine((data, ctx) => {
    const start = parsePlannedDateTime(data.plannedStart, data.plannedStartTime);
    const end = parsePlannedDateTime(data.plannedEnd, data.plannedEndTime);

    if (!start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Planned start date and time is invalid',
        path: ['plannedStart'],
      });
    }

    if (!end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Planned end date and time is invalid',
        path: ['plannedEnd'],
      });
    }

    if (start && end && !(end > start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be after start time',
        path: ['plannedEnd'],
      });
    }

    for (const containerId of data.containerIds) {
      const selections = data.hblSelections?.[containerId] ?? [];
      if (!selections.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selected container has no HBLs available.',
          path: ['hblSelections', containerId],
        });
      }
    }
  });

export type DestuffingPlanFormData = z.infer<typeof createDestuffingPlanSchema>;

export const destuffingPlanDefaultValues: DestuffingPlanFormData = {
  planType: 'DESTUFFING',
  forwarderId: '',
  plannedStart: '',
  plannedStartTime: '',
  plannedEnd: '',
  plannedEndTime: '',
  equipmentBooked: false,
  approvedAppointment: false,
  containerIds: [],
  hblSelections: {},
};

export const destuffingPlanHeaderSchema = z
  .object({
    plannedStart: z.string().min(1, 'Planned start date and time is required'),
    plannedStartTime: z.string().optional().default(''),
    plannedEnd: z.string().min(1, 'Planned end date and time is required'),
    plannedEndTime: z.string().optional().default(''),
    equipmentBooked: z.boolean().default(false),
    approvedAppointment: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const start = parsePlannedDateTime(data.plannedStart, data.plannedStartTime);
    const end = parsePlannedDateTime(data.plannedEnd, data.plannedEndTime);

    if (!start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Planned start date and time is invalid',
        path: ['plannedStart'],
      });
    }

    if (!end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Planned end date and time is invalid',
        path: ['plannedEnd'],
      });
    }

    if (start && end && !(end > start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be after start time',
        path: ['plannedEnd'],
      });
    }
  });

export type DestuffingPlanHeaderFormData = z.infer<typeof destuffingPlanHeaderSchema>;

export const destuffingPlanHeaderDefaultValues: DestuffingPlanHeaderFormData = {
  plannedStart: '',
  plannedStartTime: '',
  plannedEnd: '',
  plannedEndTime: '',
  equipmentBooked: false,
  approvedAppointment: false,
};
