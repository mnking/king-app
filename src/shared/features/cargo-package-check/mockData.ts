import {
  CargoStatus,
  CustomsStatus,
  type CargoPackageCheckData,
  type CargoPackageCheckItem,
} from './types';

import type { CargoPackageRecord } from '@/features/cargo-package-storage/types';

const baseData: CargoPackageCheckData = {
  flow: {
    title: 'Cargo package check',
    hblNumber: 'HBL-778899',
    workingStatus: 'in-progress',
  },
  packages: [],
};

export async function fetchMockCargoPackageData(): Promise<CargoPackageCheckData> {
  const cargoPackages: CargoPackageRecord[] = [
    {
      id: '5b3c8f1b-6a22-4a4b-ae6a-0d21b0d0c7c1',
      lineNo: 1,
      packingListId: '550e8400-e29b-41d4-a716-446655440000',
      lineId: 'ae7c1d44-2d60-44a1-a3f9-2b3fdad3d4f7',
      packageNo: 'PKG-001',
      cargoDescription: 'Textile rolls',
      packageType: 'Pallet',
      conditionStatus: 'NORMAL',
      regulatoryStatus: 'UNINSPECTED',
      positionStatus: 'STORED',
    },
    {
      id: 'c6b1a7d3-1b57-4b8a-82b9-4f3e2e3a5a12',
      lineNo: 1,
      packingListId: '550e8400-e29b-41d4-a716-446655440000',
      lineId: 'ae7c1d44-2d60-44a1-a3f9-2b3fdad3d4f7',
      packageNo: null,
      cargoDescription: 'Textile rolls',
      packageType: 'Pallet',
      conditionStatus: null,
      regulatoryStatus: null,
      positionStatus: 'CHECK_IN',
    },
    {
      id: '0a1f6b5c-9d12-4a7d-bc54-8d68d7f7c0b9',
      lineNo: 2,
      packingListId: '550e8400-e29b-41d4-a716-446655440000',
      lineId: '2c2e9b6a-6d8f-4f0d-8b7f-4a3c2d1e0f9a',
      packageNo: 'PKG-003',
      cargoDescription: 'Household goods',
      packageType: 'Carton',
      conditionStatus: 'CARGO_DAMAGED',
      regulatoryStatus: 'ON_HOLD',
      positionStatus: 'STORED',
    },
    {
      id: 'b8eaa9b5-2c3a-4d1c-9b11-6b7b1a2a9f4d',
      lineNo: 1,
      packingListId: '5c8d3d2f-0b6a-4e2a-a2b7-5b4c3d2e1f0a',
      lineId: '8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e',
      packageNo: null,
      cargoDescription: 'Electronics accessories',
      packageType: 'Carton',
      conditionStatus: 'NORMAL',
      regulatoryStatus: 'PASSED',
      positionStatus: 'CHECK_IN',
    },
    {
      id: 'd2b7c6a1-0f2e-4c3b-9a8d-7e6f5a4b3c2d',
      lineNo: 2,
      packingListId: '5c8d3d2f-0b6a-4e2a-a2b7-5b4c3d2e1f0a',
      lineId: '9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
      packageNo: 'PKG-005',
      cargoDescription: 'Furniture parts',
      packageType: 'Crate',
      conditionStatus: null,
      regulatoryStatus: null,
      positionStatus: 'UNKNOWN',
    },
  ];

  const packages: CargoPackageCheckItem[] = cargoPackages.map((pkg) => ({
    id: pkg.id,
    packageNo: pkg.packageNo ?? null,
    packingListId: pkg.packingListId,
    hblNumber: baseData.flow.hblNumber,
    lineId: pkg.lineId ?? pkg.id,
    lineNo: pkg.lineNo ?? 0,
    cargoDescription: pkg.cargoDescription ?? '',
    packageType: pkg.packageType ?? '',
    cargoStatus: (pkg.conditionStatus as CargoStatus | null | undefined) ?? null,
    customsStatus:
      (pkg.regulatoryStatus as CustomsStatus | null | undefined) ?? null,
    isChecked: false,
    checkedDate: null,
  }));

  return {
    flow: { ...baseData.flow },
    packages,
  };
}
