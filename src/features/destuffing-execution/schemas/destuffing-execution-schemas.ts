import { z } from 'zod';

export const ResealSchema = z.object({
  newSealNumber: z.string().min(1, 'New seal number is required'),
  onHoldFlag: z.boolean(),
  note: z.string().max(500, 'Note must be at most 500 characters').optional().nullable(),
});

export const DestuffResultSchema = z.object({
  document: z
    .object({
      id: z.string().min(1, 'Document id is required'),
      name: z.string().min(1, 'Document name is required'),
      url: z.string().optional(),
      mimeType: z.string().min(1, 'Document mimeType is required'),
      sizeBytes: z.number().nonnegative().optional(),
    })
    .nullable()
    .optional(),
  image: z
    .object({
      id: z.string().min(1, 'Image id is required'),
      name: z.string().min(1, 'Image name is required'),
      url: z.string().optional(),
      mimeType: z.string().min(1, 'Image mimeType is required'),
      sizeBytes: z.number().nonnegative().optional(),
    })
    .nullable()
    .optional(),
  note: z.string().max(500, 'Note must be at most 500 characters').optional().nullable(),
  onHold: z.boolean(),
});

export type ResealFormValues = z.infer<typeof ResealSchema>;
export type DestuffResultFormValues = z.infer<typeof DestuffResultSchema>;
