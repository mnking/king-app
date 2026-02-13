import { z } from 'zod';
import { containerNumberSchema } from '@/features/containers/schemas';

const optionalContainerNumberSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
  },
  containerNumberSchema.optional().nullable(),
);

export const ContainerFormSchema = z.object({
  containerNumber: optionalContainerNumberSchema,
  containerTypeCode: z.string().min(1, 'Container type is required'),
  estimatedStuffingAt: z.string().optional().nullable(),
  estimatedMoveAt: z.string().optional().nullable(),
  equipmentBooked: z.boolean().default(false),
  appointmentBooked: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export type ContainerFormValues = z.infer<typeof ContainerFormSchema>;

export const containerFormDefaultValues: ContainerFormValues = {
  containerNumber: null,
  containerTypeCode: '',
  estimatedStuffingAt: null,
  estimatedMoveAt: null,
  equipmentBooked: false,
  appointmentBooked: false,
  notes: null,
};
