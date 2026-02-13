import type { Forwarder } from '@/features/forwarder/types';
import type { HouseBill } from '@/features/hbl-management/types';
import type {
  PackingListCreatePayload,
  PackingListDetail,
  PackingListFormValues,
  PackingListLineCreatePayload,
  PackingListLineFormValues,
  PackingListLineResponseDto,
  PackingListStatus,
} from '../types';
import type { PackingListFormSchemaType } from '../schemas';

export interface SelectedHblMeta {
  hblCode: string;
  containerNumber: string;
  containerType: string;
  sealNumber: string;
  vesselName: string;
  voyageNumber: string;
  consignee: string;
  forwarderName: string;
  forwarderId: string | null;
}

export interface PackingListLineDraft extends PackingListLineFormValues {
  clientId: string;
  persistedId?: string;
  isDirty?: boolean;
}

export const generateClientId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const coerceNumericField = (
  value: number | string | null | undefined,
): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const normalizeLineValues = (
  line: PackingListLineFormValues,
): PackingListLineFormValues => ({
  ...line,
  quantity: coerceNumericField(line.quantity),
  numberOfPackages: coerceNumericField(line.numberOfPackages),
  grossWeightKg: coerceNumericField(line.grossWeightKg),
  volumeM3: coerceNumericField(line.volumeM3),
});

export const areLineValuesEqual = (
  current: PackingListLineFormValues,
  baseline: PackingListLineFormValues,
) => {
  const normalizedCurrent = normalizeLineValues(current);
  const normalizedBaseline = normalizeLineValues(baseline);

  return (
    normalizedCurrent.commodityDescription ===
      normalizedBaseline.commodityDescription &&
    normalizedCurrent.unitOfMeasure === normalizedBaseline.unitOfMeasure &&
    normalizedCurrent.packageTypeCode === normalizedBaseline.packageTypeCode &&
    normalizedCurrent.quantity === normalizedBaseline.quantity &&
    normalizedCurrent.numberOfPackages === normalizedBaseline.numberOfPackages &&
    normalizedCurrent.grossWeightKg === normalizedBaseline.grossWeightKg &&
    normalizedCurrent.volumeM3 === normalizedBaseline.volumeM3 &&
    normalizedCurrent.shipmarks === normalizedBaseline.shipmarks &&
    normalizedCurrent.imdg === normalizedBaseline.imdg
  );
};

export const convertFormValuesToPayload = (
  formValues: PackingListLineFormValues,
): PackingListLineCreatePayload => {
  const normalized = normalizeLineValues(formValues);
  return {
    commodityDescription: normalized.commodityDescription,
    unitOfMeasure: normalized.unitOfMeasure,
    packageTypeCode: normalized.packageTypeCode,
    quantity: normalized.quantity ?? 0,
    numberOfPackages: normalized.numberOfPackages ?? 0,
    grossWeightKg: normalized.grossWeightKg ?? 0,
    volumeM3: normalized.volumeM3 ?? 0,
    shipmarks: normalized.shipmarks ?? '',
    imdg: normalized.imdg,
  };
};

const mapLineResponseToFormValues = (
  line: PackingListLineResponseDto,
): PackingListLineFormValues =>
  normalizeLineValues({
    commodityDescription: line.commodityDescription,
    unitOfMeasure: line.unitOfMeasure,
    packageTypeCode: line.packageTypeCode,
    quantity: line.quantity,
    numberOfPackages: line.numberOfPackages,
    grossWeightKg: line.grossWeightKg,
    volumeM3: line.volumeM3,
    shipmarks: line.shipmarks,
    imdg: line.imdg ?? null,
  });

export const mapResponseToDraft = (
  line: PackingListLineResponseDto,
): PackingListLineDraft => ({
  clientId: line.id ?? generateClientId(),
  persistedId: line.id,
  isDirty: false,
  ...mapLineResponseToFormValues(line),
});

export const statusStyles: Record<
  PackingListStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Draft',
    className:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  },
  PARTIAL: {
    label: 'Partial',
    className:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  },
  APPROVED: {
    label: 'Approved',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  },
  DONE: {
    label: 'Done',
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  },
};

const resolveForwarderName = (
  forwarderId: string | null | undefined,
  forwarders: Forwarder[],
  fallbackName?: string | null,
) => {
  if (fallbackName && fallbackName.trim().length > 0) {
    return fallbackName;
  }
  if (!forwarderId) return '—';
  const matched = forwarders.find((forwarder) => forwarder.id === forwarderId);
  return matched?.name ?? '—';
};

export const mapHblToMeta = (
  hbl: HouseBill,
  forwarders: Forwarder[],
): SelectedHblMeta => {
  const primaryContainer = hbl.containers?.[0];
  return {
    hblCode: hbl.code,
    containerNumber: primaryContainer?.containerNumber ?? '—',
    containerType: primaryContainer?.containerTypeCode ?? '—',
    sealNumber: primaryContainer?.sealNumber ?? '—',
    vesselName: hbl.vesselName ?? '—',
    voyageNumber: hbl.voyageNumber ?? '—',
    consignee: hbl.consignee ?? '—',
    forwarderName: resolveForwarderName(
      hbl.issuerId,
      forwarders,
      hbl.issuer?.name ?? null,
    ),
    forwarderId: hbl.issuerId ?? null,
  };
};

export const mapDetailToMeta = (
  detail: PackingListDetail,
  forwarders: Forwarder[],
): SelectedHblMeta => ({
  hblCode: detail.hblData?.hblCode ?? '—',
  containerNumber: detail.hblData?.containerNumber ?? '—',
  containerType: detail.hblData?.containerType ?? '—',
  sealNumber: detail.hblData?.sealNumber ?? '—',
  vesselName: detail.hblData?.vessel ?? '—',
  voyageNumber: detail.hblData?.voyage ?? '—',
  consignee: detail.hblData?.consignee ?? '—',
  forwarderName: resolveForwarderName(
    detail.forwarderId ?? null,
    forwarders,
    detail.hblData?.forwarderName ?? null,
  ),
  forwarderId: detail.forwarderId ?? null,
});

export const mapDetailToFormValues = (
  detail: PackingListDetail,
  fallbackDirectionFlow?: PackingListDetail['directionFlow'] | null,
): PackingListFormValues => ({
  hblId: detail.hblData?.id ?? null,
  packingListNumber: detail.packingListNumber ?? null,
  mbl: detail.mbl ?? null,
  eta: detail.eta ?? null,
  ata: detail.ata ?? null,
  directionFlow:
    detail.directionFlow ||
    detail.shippingDetail?.directionFlow ||
    fallbackDirectionFlow ||
    null,
  note: detail.note ?? null,
  workPackingListFile: detail.workPackingListFile ?? null,
  officialPackingListFile: detail.officialPackingListFile ?? null,
  forwarderId: detail.forwarderId ?? null,
  weight: detail.weight ?? null,
  volume: detail.volume ?? null,
  numberOfPackages: detail.numberOfPackages ?? null,
  cargoLines: [],
});

export const formDataToPayload = (
  data: PackingListFormSchemaType,
  lines?: PackingListLineCreatePayload[],
): PackingListCreatePayload => ({
  hblId: data.hblId ?? undefined,
  packingListNumber: data.packingListNumber,
  mbl: data.mbl,
  eta: data.eta,
  ata: data.ata,
  shippingDetail: data.directionFlow
    ? { directionFlow: data.directionFlow }
    : undefined,
  note: data.note,
  workPackingListFile: data.workPackingListFile,
  officialPackingListFile: data.officialPackingListFile,
  forwarderId: data.forwarderId,
  weight: data.weight ?? undefined,
  volume: data.volume ?? undefined,
  lines: lines,
});

export const isTotalField = (
  field: string,
): field is 'numberOfPackages' | 'weight' | 'volume' =>
  field === 'numberOfPackages' || field === 'weight' || field === 'volume';
