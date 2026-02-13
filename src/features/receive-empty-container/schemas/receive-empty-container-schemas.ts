import { z } from 'zod';

const fileMetadataSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string(),
  })
  .nullable();

export const checkContainerConditionSchema = z.object({
  note: z.string().nullable().optional(),
  plateNumber: z.string().min(1, 'Vehicle plate number is required'),
  driverName: z.string().min(1, 'Driver name is required'),
  document: fileMetadataSchema,
  image: fileMetadataSchema,
});

export type CheckContainerConditionForm = z.infer<
  typeof checkContainerConditionSchema
>;

export const checkContainerConditionDefaultValues: CheckContainerConditionForm = {
  note: null,
  plateNumber: '',
  driverName: '',
  document: null,
  image: null,
};
