import { z } from 'zod';

export const PrepayDeclarationSchema = z.object({
  containerNumber: z.string().max(20, 'Container number is too long').optional(),
  containerTypeCode: z
    .string()
    .max(10, 'Container type code is too long')
    .optional(),
  cargoStoreEnabled: z.boolean(),
  cargoStoreDays: z.number().min(0, 'Days must be 0 or greater'),
});

export type PrepayDeclarationForm = z.infer<typeof PrepayDeclarationSchema>;
