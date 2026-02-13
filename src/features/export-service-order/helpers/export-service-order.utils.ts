import type {
  ExportServiceOrderDetail,
  ExportServiceOrderDocumentFile,
  ExportServiceOrderFormBookingContainer,
  ExportServiceOrderFormBookingConfirmation,
  ExportServiceOrderFormPackingList,
  ExportServiceOrderFormValues,
  ExportServiceOrderPackingListAssignPayload,
  ExportServiceOrderPayload,
} from '../types';
import type { PackingListListItem } from '@/features/packing-list/types';
import type { CustomsDeclarationResponse } from '@/features/customs-declaration/types';
import { fromDateTimeLocalFormat, toDateTimeLocalFormat } from '@/shared/utils';

export const generateClientId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeString = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeRequestTime = (value?: string | null) => {
  const normalized = normalizeString(value);
  if (!normalized) return undefined;

  try {
    return fromDateTimeLocalFormat(normalized);
  } catch {
    return normalized;
  }
};

const toRequestTimeLocal = (value?: string | null) => {
  if (!value) return null;

  try {
    return toDateTimeLocalFormat(value);
  } catch {
    return value;
  }
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().slice(0, 10);
};

const normalizeShippingLineId = (value?: unknown | null) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
};

const normalizeFile = (
  file?: ExportServiceOrderDocumentFile | null,
): ExportServiceOrderDocumentFile | undefined => {
  if (!file) return undefined;
  return {
    id: file.id,
    name: file.name ?? undefined,
    mimeType: file.mimeType ?? undefined,
    url: file.url ?? undefined,
    sizeBytes: file.sizeBytes ?? undefined,
  };
};

export const mapPackingListItemToFormRow = (
  item: PackingListListItem,
  customsDeclaration?: CustomsDeclarationResponse | null,
): ExportServiceOrderFormPackingList => ({
  clientId: generateClientId(),
  id: null,
  packingListId: item.id,
  packingListNumber: item.packingListNumber ?? null,
  customsDeclarationNumber: customsDeclaration?.code ?? null,
  shipper:
    customsDeclaration?.shipper ??
    item.shippingDetail?.shipper ??
    item.hblData?.shipper ??
    null,
  consignee:
    customsDeclaration?.metadata?.consignee ??
    item.shippingDetail?.consignee ??
    item.hblData?.consignee ??
    null,
  workingStatus: item.workingStatus ?? null,
  planned: null,
});

export const mapOrderPackingListsToFormRows = (
  packingLists: ExportServiceOrderDetail['packingLists'],
): ExportServiceOrderFormPackingList[] =>
  (packingLists ?? []).map((row) => ({
    clientId: generateClientId(),
    id: row.id ?? null,
    packingListId: row.packingListId ?? null,
    packingListNumber: row.packingListNumber ?? null,
    customsDeclarationNumber: row.customsDeclarationNumber ?? null,
    shipper: row.shipper ?? null,
    consignee: row.consignee ?? null,
    workingStatus: row.workingStatus ?? null,
    planned: row.planned ?? null,
  }));

export const mapFormPackingListToAssignPayload = (
  row: ExportServiceOrderFormPackingList,
): ExportServiceOrderPackingListAssignPayload | null => {
  if (!row.packingListId) return null;

  return {
    packingListId: row.packingListId,
    packingListNumber: row.packingListNumber ?? undefined,
    customsDeclarationNumber: row.customsDeclarationNumber ?? undefined,
    shipper: row.shipper ?? undefined,
    consignee: row.consignee ?? undefined,
  };
};

const mapBookingConfirmationToFormValues = (
  bookingConfirmation: ExportServiceOrderDetail['bookingConfirmation'],
): ExportServiceOrderFormBookingConfirmation => ({
  bookingNumber: bookingConfirmation?.bookingNumber ?? null,
  bookingDate: toDateInputValue(bookingConfirmation?.bookingDate ?? null),
  shippingLine: normalizeShippingLineId(bookingConfirmation?.shippingLine ?? null),
  vessel: bookingConfirmation?.vessel ?? null,
  voyage: bookingConfirmation?.voyage ?? null,
  etd: toDateInputValue(bookingConfirmation?.etd ?? null),
  pol: bookingConfirmation?.pol ?? null,
  pod: bookingConfirmation?.pod ?? null,
  note: bookingConfirmation?.note ?? null,
  bookingFile: bookingConfirmation?.bookingFile ?? null,
});

const mapBookingContainersToFormValues = (
  bookingContainers: ExportServiceOrderDetail['bookingContainers'],
): ExportServiceOrderFormBookingContainer[] =>
  (bookingContainers ?? []).map((container) => ({
    clientId: generateClientId(),
    containerTypeCode: container.containerTypeCode ?? null,
    amount: container.amount ?? null,
  }));

export const mapOrderToFormValues = (
  order: ExportServiceOrderDetail,
): ExportServiceOrderFormValues => ({
  forwarderId: order.forwarderId ?? null,
  forwarderCode: order.forwarderCode ?? null,
  requestTime: toRequestTimeLocal(order.requestTime ?? null),
  bookingConfirmation: mapBookingConfirmationToFormValues(
    order.bookingConfirmation ?? null,
  ),
  bookingContainers: mapBookingContainersToFormValues(order.bookingContainers ?? []),
  packingLists: mapOrderPackingListsToFormRows(order.packingLists ?? []),
});

export const mapFormValuesToPayload = (
  values: ExportServiceOrderFormValues,
): ExportServiceOrderPayload => ({
  forwarderId: normalizeString(values.forwarderId),
  forwarderCode: normalizeString(values.forwarderCode),
  requestTime: normalizeRequestTime(values.requestTime),
  bookingConfirmation: {
    bookingNumber: normalizeString(values.bookingConfirmation.bookingNumber),
    bookingDate: normalizeString(values.bookingConfirmation.bookingDate),
    shippingLine: normalizeString(values.bookingConfirmation.shippingLine),
    vessel: normalizeString(values.bookingConfirmation.vessel),
    voyage: normalizeString(values.bookingConfirmation.voyage),
    etd: normalizeString(values.bookingConfirmation.etd),
    pol: normalizeString(values.bookingConfirmation.pol),
    pod: normalizeString(values.bookingConfirmation.pod),
    note: normalizeString(values.bookingConfirmation.note),
    bookingFile:
      normalizeFile(values.bookingConfirmation.bookingFile) ?? null,
  },
  bookingContainers: values.bookingContainers
    .filter(
      (container) =>
        Boolean(normalizeString(container.containerTypeCode)) &&
        container.amount !== null &&
        container.amount !== undefined,
    )
    .map((container) => ({
      containerTypeCode: normalizeString(container.containerTypeCode),
      amount: container.amount ?? undefined,
    })),
});
