import { describe, expect, it } from 'vitest';

import { buildSelections, groupCheckedByLine } from '../utils';
import { CargoStatus, CustomsStatus, type CargoPackageCheckItem } from '../types';

const samplePackages: CargoPackageCheckItem[] = [
  {
    id: 'pkg-3',
    packageNo: '3',
    packingListId: 'PL-2',
    lineId: 'line-2',
    lineNo: 2,
    cargoDescription: 'Item 3',
    cargoType: 'Type',
    cargoUnit: 'Unit',
    packageType: 'Box',
    cargoStatus: CargoStatus.PackageDamaged,
    customsStatus: CustomsStatus.OnHold,
    isChecked: true,
    checkedDate: '2024-09-01T10:00:00.000Z',
  },
  {
    id: 'pkg-1',
    packageNo: '1',
    packingListId: 'PL-1',
    lineId: 'line-1',
    lineNo: 1,
    cargoDescription: 'Item 1',
    cargoType: 'Type',
    cargoUnit: 'Unit',
    packageType: 'Box',
    cargoStatus: CargoStatus.Normal,
    customsStatus: CustomsStatus.Uninspected,
    isChecked: true,
    checkedDate: '2024-09-01T08:00:00.000Z',
  },
  {
    id: 'pkg-2',
    packageNo: '2',
    packingListId: 'PL-1',
    lineId: 'line-2',
    lineNo: 2,
    cargoDescription: 'Item 2',
    cargoType: 'Type',
    cargoUnit: 'Unit',
    packageType: 'Crate',
    cargoStatus: CargoStatus.CargoDamaged,
    customsStatus: CustomsStatus.Passed,
    isChecked: true,
    checkedDate: '2024-09-01T09:00:00.000Z',
  },
];

describe('groupCheckedByLine', () => {
  it('groups by line and sorts by lineNo then checkedDate then packageNo', () => {
    const groups = groupCheckedByLine(samplePackages);

    expect(groups).toHaveLength(2);
    expect(groups[0].lineNo).toBe(1);
    expect(groups[0].packages[0].id).toBe('pkg-1');

    expect(groups[1].lineNo).toBe(2);
    expect(groups[1].packages[0].id).toBe('pkg-2');
    expect(groups[1].packages[1].id).toBe('pkg-3');
  });
});

describe('buildSelections', () => {
  it('builds selection map with existing statuses', () => {
    const selections = buildSelections(samplePackages);

    expect(selections['pkg-1'].cargoStatus).toBe(CargoStatus.Normal);
    expect(selections['pkg-3'].customsStatus).toBe(CustomsStatus.OnHold);
  });

  it('falls back to null when status missing', () => {
    const withMissing: CargoPackageCheckItem[] = [
      {
        id: 'pkg-4',
        packageNo: '4',
        packingListId: 'PL-3',
        lineId: 'line-3',
        lineNo: 3,
        cargoDescription: 'Item 4',
        cargoType: 'Type',
        cargoUnit: 'Unit',
        packageType: 'Box',
        cargoStatus: null,
        customsStatus: null,
        isChecked: false,
      },
    ];

    const selections = buildSelections(withMissing);
    expect(selections['pkg-4'].cargoStatus).toBeNull();
    expect(selections['pkg-4'].customsStatus).toBeNull();
  });
});
