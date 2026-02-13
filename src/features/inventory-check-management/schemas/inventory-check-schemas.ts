import { z } from 'zod';
const inventoryPlanDocumentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string(),
    url: z.string(),
    sizeBytes: z.number(),
  })
  .nullable();

export const inventoryPlanCheckStatusSchema = z.enum([
  'CREATED',
  'RECORDING',
  'RECORDED',
  'EXPLAINED',
  'ADJUSTING',
  'DONE',
  'CANCELED',
]);

export const inventoryPlanCheckTypeSchema = z.enum(['INTERNAL', 'CUSTOM']);

export const inventoryPlanCheckSchema = z.object({
  id: z.string(),
  estimateStartTime: z.string(),
  type: inventoryPlanCheckTypeSchema,
  note: z.string(),
  membersNote: z.string(),
  actualStartTime: z.string(),
  resultDocument: inventoryPlanDocumentSchema,
  actualEndTime: z.string(),
  locationMismatchFlag: z.boolean(),
  qtyMismatchFlag: z.boolean(),
  status: inventoryPlanCheckStatusSchema,
});

export const inventoryPlanCheckDefaultValues = {
  estimateStartTime: new Date().toISOString(),
  type: 'INTERNAL' as const,
  note: '',
  membersNote: '',
  actualStartTime: '',
  resultDocument: null,
  actualEndTime: '',
  locationMismatchFlag: false,
  qtyMismatchFlag: false,
  status: 'CREATED' as const,
};

export type InventoryPlanCheckFormData = z.infer<
  typeof inventoryPlanCheckSchema
>;

export const inventoryPlanFormSchema = z.object({
  estimateStartTime: z.string(),
  membersNote: z.string().optional(),
  note: z.string().optional(),
  type: inventoryPlanCheckTypeSchema,
});

export const inventoryPlanFormDefaultValues = {
  estimateStartTime: new Date().toISOString(),
  membersNote: '',
  note: '',
  type: 'INTERNAL' as const,
};

export type InventoryPlanFormData = z.infer<typeof inventoryPlanFormSchema>;
