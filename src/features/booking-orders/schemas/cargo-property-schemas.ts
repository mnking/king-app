import { z, type RefinementCtx } from 'zod';
import { containerNumberSchema } from '@/features/containers/schemas/container-picker.schema';
import { CUSTOMS_STATUS, CARGO_RELEASE_STATUS } from '@/shared/constants/container-status';

// ===========================
// Cargo Nature and Properties
// ===========================

export const CargoNatureEnum = z.enum(['GC', 'RC', 'HC', 'LC', 'DG', 'OOG']);

export const IMOClassEnum = z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9']);

// Dangerous Goods Properties Schema
export const DangerousGoodsSchema = z.object({
  imoClass: IMOClassEnum,
  unNumber: z.string().min(1, 'UN number is required for dangerous goods'),
  dgPage: z.string().nullable().optional(),
  flashPoint: z.string().nullable().optional(),
});

// Out of Gauge Properties Schema
export const OutOfGaugeSchema = z.object({
  oogDescription: z.string().min(1, 'OOG description is required'),
});

// Discriminated union for cargo properties
export const CargoPropertiesSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('DG'),
    properties: DangerousGoodsSchema,
  }),
  z.object({
    type: z.literal('OOG'),
    properties: OutOfGaugeSchema,
  }),
  z.object({
    type: z.literal('none'),
    properties: z.null(),
  }),
]);

// ===========================
// Container Summary Schema
// ===========================

export const ContainerSummarySchema = z.object({
  typeCode: z.string().optional(),
  tareWeightKg: z.number().optional(),
  cargo_nature: CargoNatureEnum.optional(),
  cargo_properties: z
    .union([DangerousGoodsSchema, OutOfGaugeSchema, z.null()])
    .optional(),
});

// ===========================
// Container Form Schema (Draft Mode)
// ===========================

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid UUID format');

// ISO date validation helper (accepts YYYY-MM-DD or ISO datetime format)
const isoDateSchema = z
  .string()
  .min(1, 'Date is required')
  .refine(
    (val) => {
      // Accept YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
      // Accept ISO datetime format (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(val)) return true;
      return false;
    },
    {
      message: 'Invalid date format (expected YYYY-MM-DD or ISO datetime)',
    },
  );

const optionalIsoDateSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  isoDateSchema.nullable().optional(),
);

// Status enum schemas
export const customsStatusSchema = z.enum([
  CUSTOMS_STATUS.NOT_REGISTERED,
  CUSTOMS_STATUS.REGISTERED,
  CUSTOMS_STATUS.PENDING_APPROVAL,
  CUSTOMS_STATUS.HAS_CCP,
  CUSTOMS_STATUS.REJECTED,
]);

export const cargoReleaseStatusSchema = z.enum([
  CARGO_RELEASE_STATUS.NOT_REQUESTED,
  CARGO_RELEASE_STATUS.REQUESTED,
  CARGO_RELEASE_STATUS.APPROVED,
]);

const ContainerFormSchemaBase = z.object({
  id: z.string().uuid().optional(), // For existing containers
  containerId: uuidSchema,
  containerNo: containerNumberSchema, // ISO 6346 validation with check digit
  isPriority: z.boolean().default(false),
  isAtYard: z.boolean().default(false),
  mblNumber: z.string().max(50, 'MBL number must be less than 50 characters').nullable().optional(),
  customsStatus: customsStatusSchema.default(CUSTOMS_STATUS.NOT_REGISTERED),
  cargoReleaseStatus: cargoReleaseStatusSchema.default(CARGO_RELEASE_STATUS.NOT_REQUESTED),
  sealNumber: z.string().min(1, 'Seal number is required'), // Required field
  yardFreeFrom: isoDateSchema.nullable().optional(),
  yardFreeTo: optionalIsoDateSchema,
  extractFrom: isoDateSchema.nullable().optional(),
  extractTo: optionalIsoDateSchema,
  eta: isoDateSchema.nullable().optional(),
  containerFile: z
    .object({
      id: z.string().uuid().optional().nullable(),
      name: z.string().optional().nullable(),
      mimeType: z.string().optional().nullable(),
      url: z.string().url().optional().nullable(),
      sizeBytes: z.number().nonnegative().optional().nullable(),
    })
    .nullable()
    .optional(),
  // Frontend form fields
  typeCode: z.string().optional(),
  tareWeightKg: z.number().optional(),
  cargoNature: CargoNatureEnum.optional(),
  cargoProperties: z
    .union([DangerousGoodsSchema, OutOfGaugeSchema, z.null()])
    .optional(),
  // Business Rule: Each container can have multiple HBLs in a booking order
  // (A booking order can handle multiple destuffing operations for the same container)
  hbls: z.array(z.any()).optional(), // HBLs optional for draft
});

const validateCargoClassification = (data: z.infer<typeof ContainerFormSchemaBase>, ctx: RefinementCtx) => {
  if (data.cargoNature === 'DG') {
    if (!data.cargoProperties) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Dangerous goods properties are required',
        path: ['cargoProperties'],
      });
      return;
    }

    const props = data.cargoProperties as z.infer<typeof DangerousGoodsSchema>;

    if (!props.imoClass) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'IMO class is required for dangerous goods',
        path: ['cargoProperties', 'imoClass'],
      });
    }

    if (!props.unNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UN number is required for dangerous goods',
        path: ['cargoProperties', 'unNumber'],
      });
    }

    if (props.imoClass === '3' && !props.flashPoint) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Flash point is required for IMO class 3',
        path: ['cargoProperties', 'flashPoint'],
      });
    }
  }

  if (data.cargoNature === 'OOG') {
    if (!data.cargoProperties) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OOG description is required',
        path: ['cargoProperties'],
      });
      return;
    }

    const props = data.cargoProperties as z.infer<typeof OutOfGaugeSchema>;

    if (!props.oogDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OOG description is required for out of gauge cargo',
        path: ['cargoProperties', 'oogDescription'],
      });
    }
  }
};

export const ContainerFormSchema = ContainerFormSchemaBase.superRefine(validateCargoClassification);

// ===========================
// Container Approval Schema (Strict Validation)
// ===========================

export const ContainerApprovalSchema = ContainerFormSchemaBase.extend({
  hbls: z.array(z.any())
    .min(1, 'At least 1 HBL is required per container for approval'),
}).superRefine(validateCargoClassification);

// ===========================
// Cargo Nature Options
// ===========================

export const cargoNatureOptions = [
  { value: 'GC', label: 'General Cargo' },
  { value: 'RC', label: 'Reefer Cargo' },
  { value: 'HC', label: 'Heavy Cargo' },
  { value: 'LC', label: 'Liquid Cargo' },
  { value: 'DG', label: 'Dangerous Goods' },
  { value: 'OOG', label: 'Out of Gauge' },
] as const;

export const imoClassOptions = [
  { value: '1', label: 'Class 1 - Explosives' },
  { value: '2', label: 'Class 2 - Gases' },
  { value: '3', label: 'Class 3 - Flammable Liquids' },
  { value: '4', label: 'Class 4 - Flammable Solids' },
  { value: '5', label: 'Class 5 - Oxidizing Substances' },
  { value: '6', label: 'Class 6 - Toxic Substances' },
  { value: '7', label: 'Class 7 - Radioactive Material' },
  { value: '8', label: 'Class 8 - Corrosives' },
  { value: '9', label: 'Class 9 - Miscellaneous' },
] as const;

// ===========================
// Type Inference
// ===========================

export type ContainerFormData = z.infer<typeof ContainerFormSchema>;
export type ContainerApprovalData = z.infer<typeof ContainerApprovalSchema>;
export type CargoPropertiesData = z.infer<typeof CargoPropertiesSchema>;
export type DangerousGoodsData = z.infer<typeof DangerousGoodsSchema>;
export type OutOfGaugeData = z.infer<typeof OutOfGaugeSchema>;

// ===========================
// Default Values
// ===========================

export const containerDefaultValues: Partial<ContainerFormData> = {
  containerId: '',
  containerNo: '',
  isPriority: false,
  isAtYard: false,
  mblNumber: null,
  customsStatus: CUSTOMS_STATUS.NOT_REGISTERED,
  cargoReleaseStatus: CARGO_RELEASE_STATUS.NOT_REQUESTED,
  sealNumber: '', // Required field - empty string for validation
  yardFreeFrom: null,
  yardFreeTo: null,
  extractFrom: null,
  extractTo: null,
  eta: null,
  containerFile: null,
  typeCode: '',
  cargoNature: undefined,
  cargoProperties: null,
  hbls: [],
};
