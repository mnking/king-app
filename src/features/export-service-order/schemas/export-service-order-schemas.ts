import { z } from 'zod';
import type { ExportServiceOrderFormValues } from '../types';

const normalizeString = () =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === undefined || value === null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    });

const normalizeNumber = () =>
  z
    .union([z.number(), z.null(), z.undefined()])
    .transform((value) => (value === undefined ? null : value));

const fileMetadataSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    sizeBytes: z.number().nullable().optional(),
  })
  .nullable();

const bookingConfirmationSchema = z.object({
  bookingNumber: normalizeString(),
  bookingDate: normalizeString(),
  shippingLine: normalizeString(),
  vessel: normalizeString(),
  voyage: normalizeString(),
  etd: normalizeString(),
  pol: normalizeString(),
  pod: normalizeString(),
  note: normalizeString(),
  bookingFile: fileMetadataSchema,
});

const bookingContainerSchema = z.object({
  clientId: z.string(),
  containerTypeCode: normalizeString(),
  amount: normalizeNumber(),
});

const packingListSchema = z.object({
  clientId: z.string(),
  id: normalizeString(),
  packingListId: normalizeString(),
  packingListNumber: normalizeString(),
  customsDeclarationNumber: normalizeString(),
  shipper: normalizeString(),
  consignee: normalizeString(),
  workingStatus: normalizeString(),
  planned: z.boolean().nullable().optional(),
});

export const ExportServiceOrderFormSchema = z.object({
  forwarderId: normalizeString(),
  forwarderCode: normalizeString(),
  requestTime: normalizeString(),
  bookingConfirmation: bookingConfirmationSchema,
  bookingContainers: z.array(bookingContainerSchema),
  packingLists: z.array(packingListSchema),
});

export type ExportServiceOrderFormSchemaType = z.infer<
  typeof ExportServiceOrderFormSchema
>;

export const exportServiceOrderDefaultValues: ExportServiceOrderFormValues = {
  forwarderId: null,
  forwarderCode: null,
  requestTime: null,
  bookingConfirmation: {
    bookingNumber: null,
    bookingDate: null,
    shippingLine: null,
    vessel: null,
    voyage: null,
    etd: null,
    pol: null,
    pod: null,
    note: null,
    bookingFile: null,
  },
  bookingContainers: [],
  packingLists: [],
};

export interface ValidationResult {
  valid: boolean;
  data?: ExportServiceOrderFormSchemaType;
  fieldErrors?: Record<string, string>;
}

const buildFieldErrors = (error: z.ZodError) => {
  const fieldErrors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const pathKey = issue.path.join('.') || '_root';
    fieldErrors[pathKey] = issue.message;
  });
  return fieldErrors;
};

const isFutureDate = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;

  const now = new Date();
  now.setSeconds(0, 0);

  return date.getTime() > now.getTime();
};

export const getBookingContainerErrors = (
  containers: ExportServiceOrderFormSchemaType['bookingContainers'],
) => {
  const fieldErrors: Record<string, string> = {};
  const seen = new Map<string, number[]>();

  containers.forEach((container, index) => {
    const typeCode = container.containerTypeCode;
    const amount = container.amount;

    if (!typeCode) {
      fieldErrors[
        `bookingContainers.${index}.containerTypeCode`
      ] = 'Container type is required.';
    }

    if (amount === null || amount === undefined) {
      fieldErrors[`bookingContainers.${index}.amount`] = 'Amount is required.';
    } else if (typeof amount === 'number' && amount <= 0) {
      fieldErrors[`bookingContainers.${index}.amount`] =
        'Amount must be greater than 0.';
    }

    if (typeCode) {
      const entries = seen.get(typeCode) ?? [];
      entries.push(index);
      seen.set(typeCode, entries);
    }
  });

  seen.forEach((indexes, typeCode) => {
    if (indexes.length <= 1) return;
    indexes.forEach((index) => {
      fieldErrors[
        `bookingContainers.${index}.containerTypeCode`
      ] = `Duplicate container type ${typeCode}.`;
    });
  });

  return fieldErrors;
};

export const validateDraft = (
  values: ExportServiceOrderFormValues,
): ValidationResult => {
  const result = ExportServiceOrderFormSchema.safeParse(values);
  if (!result.success) {
    return { valid: false, fieldErrors: buildFieldErrors(result.error) };
  }

  const data = result.data;
  const fieldErrors: Record<string, string> = {};

  if (!data.forwarderId && !data.forwarderCode) {
    fieldErrors.forwarderId = 'Forwarder is required to save the draft.';
  }

  if (!data.requestTime) {
    fieldErrors.requestTime = 'Request time is required to save the draft.';
  } else if (!isFutureDate(data.requestTime)) {
    fieldErrors.requestTime = 'Request time must be in the future.';
  }

  const containerErrors = getBookingContainerErrors(data.bookingContainers);
  Object.assign(fieldErrors, containerErrors);

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, data, fieldErrors };
  }

  return { valid: true, data };
};

export const validateApprove = (
  values: ExportServiceOrderFormValues,
): ValidationResult => {
  const result = ExportServiceOrderFormSchema.safeParse(values);
  if (!result.success) {
    return { valid: false, fieldErrors: buildFieldErrors(result.error) };
  }

  const data = result.data;
  const fieldErrors: Record<string, string> = {};

  if (!data.forwarderId && !data.forwarderCode) {
    fieldErrors.forwarderId = 'Forwarder is required for approval';
  }

  if (!data.requestTime) {
    fieldErrors.requestTime = 'Request time is required for approval';
  }

  if (data.packingLists.length === 0) {
    fieldErrors._root = 'At least one packing list is required for approval.';
  }

  data.packingLists.forEach((row, index) => {
    if (!row.packingListId) {
      fieldErrors[
        `packingLists.${index}.packingListNumber`
      ] = 'Packing list selection is required.';
    }
  });

  const booking = data.bookingConfirmation;
  if (!booking.bookingNumber) {
    fieldErrors['bookingConfirmation.bookingNumber'] =
      'Booking confirmation number is required for approval.';
  }
  if (!booking.bookingFile?.id) {
    fieldErrors['bookingConfirmation.bookingFile'] =
      'Booking confirmation document is required for approval.';
  }
  if (!booking.bookingDate) {
    fieldErrors['bookingConfirmation.bookingDate'] =
      'Booking date is required for approval.';
  }
  if (!booking.shippingLine) {
    fieldErrors['bookingConfirmation.shippingLine'] =
      'Shipping line is required for approval.';
  }
  if (!booking.vessel) {
    fieldErrors['bookingConfirmation.vessel'] =
      'Vessel name is required for approval.';
  }
  if (!booking.voyage) {
    fieldErrors['bookingConfirmation.voyage'] =
      'Voyage number is required for approval.';
  }
  if (!booking.pol) {
    fieldErrors['bookingConfirmation.pol'] =
      'Port of loading is required for approval.';
  }
  if (!booking.pod) {
    fieldErrors['bookingConfirmation.pod'] =
      'Port of discharge is required for approval.';
  }

  if (data.bookingContainers.length === 0) {
    fieldErrors['bookingContainers'] =
      'At least one booking container is required for approval.';
  }

  const containerErrors = getBookingContainerErrors(data.bookingContainers);
  Object.assign(fieldErrors, containerErrors);

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, data, fieldErrors };
  }

  return { valid: true, data };
};
