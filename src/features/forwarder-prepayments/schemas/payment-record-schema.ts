import { z } from 'zod';

export const PaymentRecordSchema = z.object({
  actualAmount: z
    .number()
    .min(0, 'Actual amount must be 0 or greater')
    .max(
      Number.MAX_SAFE_INTEGER,
      'Actual amount is too large. Please enter a smaller value.',
    ),
  receiptNumber: z.string().max(60, 'Receipt number is too long').optional(),
  note: z.string().max(500, 'Note is too long').optional(),
});

export type PaymentRecordForm = z.infer<typeof PaymentRecordSchema>;
