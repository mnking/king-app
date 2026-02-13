import { z } from 'zod';

export const importWarehouseReceivingSchema = z.object({
  receipt: z.object({
    receiptNo: z.string().trim().min(1, 'Receipt number is required.'),
    receiptDate: z.string().trim().min(1, 'Receipt date is required.'),
  }),
  shipment: z.object({
    note: z.string().optional().nullable(),
  }),
});
