import { z } from 'zod';
import type {
  CustomsDeclarationFormValues,
  CustomsDeclarationResponse,
} from '../types';

const DocumentFileSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  sizeBytes: z.number().nullable().optional(),
});

export const CustomsDeclarationDraftSchema = z.object({
  code: z.string().optional(),
  customsOffice: z.string().optional(),
  registeredAt: z.string().optional(),
  consignee: z.string().optional(),
  mainDocument: DocumentFileSchema.nullable().optional(),
  etd: z.string().optional(),
  clearanceSource: z.enum(['API', 'MANUAL']).optional(),
});

export const CustomsDeclarationApprovalSchema = z
  .object({
    code: z.string().min(1, 'Declaration code is required'),
    customsOffice: z.string().min(1, 'Customs office is required'),
    registeredAt: z.string().min(1, 'Register date is required'),
    mainDocument: DocumentFileSchema,
  })
  .passthrough();

export const buildCustomsDeclarationFormValues = (
  declaration?: CustomsDeclarationResponse | null,
): CustomsDeclarationFormValues => ({
  code: declaration?.code ?? '',
  customsOffice: declaration?.customsOffice ?? '',
  registeredAt: declaration?.registeredAt
    ? declaration.registeredAt.split('T')[0]
    : '',
  consignee: declaration?.metadata?.consignee ?? '',
  mainDocument: declaration?.mainDocument ?? null,
  etd: declaration?.metadata?.etd ?? '',
  clearanceSource: declaration?.clearanceSource ?? 'API',
});
