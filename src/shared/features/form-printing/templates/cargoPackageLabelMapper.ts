import type {
  CargoPackageLabelPayload,
  RenderContext,
  RenderIssue,
} from '../types';

export interface CargoPackageLabelMapperResult {
  payload: CargoPackageLabelPayload;
  issues: RenderIssue[];
}

export const mapCargoPackageLabel = (
  context: RenderContext<'CARGO_PACKAGE_LABEL'>,
): CargoPackageLabelMapperResult => {
  const issues: RenderIssue[] = [];
  const { packingList, packages } = context;
  const hbl = packingList.hblData;
  const packingListNumber = packingList.packingListNumber || packingList.id;

  if (!packingListNumber) {
    issues.push({
      field: 'shipment.packingListNumber',
      message: 'Packing list number is missing.',
      severity: 'warning',
    });
  }

  if (!hbl?.forwarderName) {
    issues.push({
      field: 'shipment.forwarderName',
      message: 'Forwarder name is missing from packing list data.',
      severity: 'warning',
    });
  }

  if (!hbl?.hblCode) {
    issues.push({
      field: 'shipment.hblCode',
      message: 'HBL code is missing from packing list data.',
      severity: 'warning',
    });
  }

  if (!hbl?.containerNumber) {
    issues.push({
      field: 'shipment.containerNumber',
      message: 'Container number is missing from packing list data.',
      severity: 'warning',
    });
  }

  if (!hbl?.containerType) {
    issues.push({
      field: 'shipment.containerType',
      message: 'Container type is missing from packing list data.',
      severity: 'warning',
    });
  }

  if (!hbl?.sealNumber) {
    issues.push({
      field: 'shipment.sealNumber',
      message: 'Seal number is missing from packing list data.',
      severity: 'warning',
    });
  }

  const mappedPackages =
    packages?.map((pkg, index) => ({
      id: pkg.id,
      lineNo: pkg.lineNo != null ? String(pkg.lineNo) : String(index + 1),
      packingListId: pkg.packingListId ?? packingList.id,
      lineId: pkg.lineId ?? '',
      packageNo:
        pkg.packageNo ||
        (pkg.lineNo != null
          ? `PKG-${pkg.lineNo}`
          : `PKG-${index + 1}`),
      cargoDescription: pkg.cargoDescription ?? '',
      packageType: pkg.packageType ?? '',
      conditionStatus: pkg.conditionStatus ?? null,
      regulatoryStatus: pkg.regulatoryStatus ?? null,
      positionStatus: pkg.positionStatus ?? 'UNKNOWN',
      quantity: 1,
    })) ?? [];

  if (!mappedPackages.length) {
    issues.push({
      field: 'packages',
      message: 'No cargo packages found. At least one package is required.',
      severity: 'error',
    });
  }

  const payload: CargoPackageLabelPayload = {
    shipment: {
      packingListNumber,
      forwarderName: hbl?.forwarderName ?? '',
      hblCode: hbl?.hblCode ?? '',
      containerNumber: hbl?.containerNumber ?? '',
      containerType: hbl?.containerType ?? '',
      sealNumber: hbl?.sealNumber ?? '',
    },
    packages: mappedPackages,
  };

  return { payload, issues };
};
