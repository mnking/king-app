import { describe, expect, it } from 'vitest';
import { groupStuffedByLine } from '../helpers/groupStuffedByLine';
import { CargoStatus, CustomsStatus, type CargoPackageStuffingItem } from '../types';

const baseItem = (overrides: Partial<CargoPackageStuffingItem>): CargoPackageStuffingItem => ({
  id: 'id',
  packageNo: 'PKG-1',
  packingListId: 'PL-1',
  hblNumber: null,
  lineId: 'line-1',
  lineNo: 1,
  cargoDescription: 'Item',
  cargoType: null,
  cargoUnit: null,
  packageType: 'BOX',
  cargoStatus: CargoStatus.Normal,
  customsStatus: CustomsStatus.Uninspected,
  isChecked: true,
  checkedDate: '2026-01-16T10:00:00.000Z',
  ...overrides,
});

describe('groupStuffedByLine', () => {
  it('groups by lineNo asc (null last) and sorts by customs then cargo with stable tie', () => {
    const items: CargoPackageStuffingItem[] = [
      baseItem({ id: 'a', lineNo: 2, customsStatus: CustomsStatus.Passed, cargoStatus: CargoStatus.Normal, packageNo: 'B' }),
      baseItem({ id: 'b', lineNo: 1, customsStatus: CustomsStatus.Uninspected, cargoStatus: CargoStatus.CargoDamaged, packageNo: 'A' }),
      baseItem({ id: 'c', lineNo: 1, customsStatus: CustomsStatus.Uninspected, cargoStatus: CargoStatus.CargoDamaged, packageNo: 'C' }),
      baseItem({ id: 'd', lineNo: null, customsStatus: null, cargoStatus: null, packageNo: 'Z' }),
      baseItem({ id: 'e', lineNo: 1, customsStatus: CustomsStatus.Passed, cargoStatus: CargoStatus.Normal, packageNo: 'D' }),
    ];

    const groups = groupStuffedByLine(items);

    expect(groups.map(group => group.lineNo)).toEqual([1, 2, null]);
    expect(groups[0].packages.map(pkg => pkg.id)).toEqual(['b', 'c', 'e']);
    expect(groups[1].packages.map(pkg => pkg.id)).toEqual(['a']);
    expect(groups[2].packages.map(pkg => pkg.id)).toEqual(['d']);
  });
});
