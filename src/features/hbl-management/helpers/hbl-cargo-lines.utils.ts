import type {
  CargoTypeCode,
  HblPackingListLineFormValues,
  HblPackingListLinePayload,
  HblPackingListLineResponseDto,
} from '../types';

export interface HblPackingListLineDraft extends HblPackingListLineFormValues {
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
  line: HblPackingListLineFormValues,
): HblPackingListLineFormValues => ({
  ...line,
  quantity: coerceNumericField(line.quantity),
  numberOfPackages: coerceNumericField(line.numberOfPackages),
  grossWeightKg: coerceNumericField(line.grossWeightKg),
  volumeM3: coerceNumericField(line.volumeM3),
});

export const areLineValuesEqual = (
  current: HblPackingListLineFormValues,
  baseline: HblPackingListLineFormValues,
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
  formValues: HblPackingListLineFormValues,
): HblPackingListLinePayload => {
  const normalized = normalizeLineValues(formValues);
  return {
    commodityDescription: normalized.commodityDescription,
    unitOfMeasure: normalized.unitOfMeasure,
    packageTypeCode: normalized.packageTypeCode as CargoTypeCode,
    quantity: normalized.quantity ?? 0,
    numberOfPackages: normalized.numberOfPackages ?? 0,
    grossWeightKg: normalized.grossWeightKg ?? 0,
    volumeM3: normalized.volumeM3 ?? 0,
    shipmarks: normalized.shipmarks ?? undefined,
    imdg: normalized.imdg ?? undefined,
    cargoType: normalized.packageTypeCode ?? undefined,
  };
};

const mapLineResponseToFormValues = (
  line: HblPackingListLineResponseDto,
): HblPackingListLineFormValues =>
  normalizeLineValues({
    commodityDescription: line.commodityDescription,
    unitOfMeasure: line.unitOfMeasure,
    packageTypeCode: line.packageTypeCode ?? null,
    quantity: line.quantity,
    numberOfPackages: line.numberOfPackages,
    grossWeightKg: line.grossWeightKg,
    volumeM3: line.volumeM3,
    shipmarks: line.shipmarks ?? null,
    imdg: line.imdg ?? null,
  });

export const mapResponseToDraft = (
  line: HblPackingListLineResponseDto,
): HblPackingListLineDraft => ({
  clientId: line.id ?? generateClientId(),
  persistedId: line.id,
  isDirty: false,
  ...mapLineResponseToFormValues(line),
});
