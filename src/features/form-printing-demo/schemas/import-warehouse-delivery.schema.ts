import { z } from 'zod';

export const importWarehouseDeliverySchema = z.object({
  receipt: z.object({
    receiptNo: z.string().trim().min(1, 'Receipt number is required.'),
    receiptDate: z.string().trim().min(1, 'Receipt date is required.'),
  }),
  delivery: z.object({
    batchNo: z
      .union([z.string(), z.number()])
      .transform((value) => String(value).trim())
      .refine((value) => value.length > 0, 'Batch number is required.'),
  }),
  shipment: z.object({
    note: z.string().optional().nullable(),
  }),
});
