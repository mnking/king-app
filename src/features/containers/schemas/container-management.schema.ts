import { z } from 'zod';

export const containerFormSchema = z.object({
  number: z
    .string({ required_error: 'Container number is required' })
    .trim()
    .min(11, 'Container number must be 11 characters')
    .max(11, 'Container number must be 11 characters'),
  containerTypeCode: z
    .string({ required_error: 'Container type is required' })
    .trim()
    .min(3, 'Type code must be at least 3 characters'),
});

export const containerUpdateSchema = containerFormSchema.partial();

export type ContainerFormValues = z.infer<typeof containerFormSchema>;
export type ContainerUpdateFormValues = z.infer<typeof containerUpdateSchema>;

export const containerTypeFormSchema = z.object({
  code: z
    .string({ required_error: 'ISO code is required' })
    .trim()
    .min(3)
    .max(4),
  size: z.string({ required_error: 'Size is required' }).trim(),
  description: z.string().trim().optional(),
});

export type ContainerTypeFormValues = z.infer<typeof containerTypeFormSchema>;

export const cycleStatusSchema = z
  .string()
  .optional()
  .default('ACTIVE');

export const containerCycleFormSchema = z.object({
  containerNumber: z
    .string({ required_error: 'Container number is required' })
    .trim()
    .min(11, 'Container number must be 11 characters')
    .max(11, 'Container number must be 11 characters'),
  code: z.string().optional(),
  operationMode: z.string().optional(),
  startEvent: z.string({ required_error: 'Start event is required' }),
  endEvent: z.string().nullable().optional(),
  cargoLoading: z.string().optional(),
  customsStatus: z.string().optional(),
  condition: z.string().optional(),
  sealNumber: z.string().nullable().optional(),
  containerStatus: z.string().optional(),
  status: cycleStatusSchema,
  isActive: z.boolean().optional().default(true),
});

export type ContainerCycleFormValues = z.infer<typeof containerCycleFormSchema>;

export const containerCycleEndSchema = z.object({
  endEvent: z.string({ required_error: 'End event is required' }),
  status: z.string().optional(),
});

export type ContainerCycleEndFormValues = z.infer<typeof containerCycleEndSchema>;

export const CONTAINER_EVENT_TYPES = [
  'DISCHARGE',
  'LOAD',
  'GATE_IN',
  'GATE_OUT',
  'YARD_IN',
  'YARD_OUT',
  'YARD_MOVE',
  'CFS_IN',
  'CFS_OUT',
  'CFS_MOVE',
  'MR_IN',
  'MR_OUT',
  'MR_MOVE',
  'BARGE_IN',
  'BARGE_OUT',
  'BARGE_MOVE',
  'CUSTOMS_TRANSFER',
  'CUSTOMS_SEIZED',
  'CONTAINER_SEALED',
  'CONTAINER_UNSEALED',
] as const;

export const containerTransactionFormSchema = z.object({
  containerNumber: z
    .string({ required_error: 'Container number is required' })
    .trim()
    .min(11, 'Container number must be 11 characters')
    .max(11, 'Container number must be 11 characters'),
  cycleId: z.string().optional(),
  eventType: z.enum(CONTAINER_EVENT_TYPES, { required_error: 'Event type is required' }),
  cargoLoading: z.string().optional(),
  customsStatus: z.string().optional(),
  condition: z.string().optional(),
  sealNumber: z.string().nullable().optional(),
  status: z.string().optional(),
  timestamp: z
    .string({ required_error: 'Timestamp is required' })
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid timestamp'),
});

export type ContainerTransactionFormValues = z.infer<
  typeof containerTransactionFormSchema
>;
