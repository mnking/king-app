import type { CargoPackageStuffingItem, CargoStatus, CustomsStatus } from '../types';

export interface StuffedLineGroup {
  lineNo: number | null;
  packages: CargoPackageStuffingItem[];
}

const customsOrder: CustomsStatus[] = ['UNINSPECTED', 'PASSED', 'ON_HOLD'];
const cargoOrder: CargoStatus[] = ['NORMAL', 'PACKAGE_DAMAGED', 'CARGO_DAMAGED'];

const rank = <T>(value: T | null, order: T[]) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const index = order.indexOf(value);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export const groupStuffedByLine = (packages: CargoPackageStuffingItem[]): StuffedLineGroup[] => {
  const withIndex = packages.map((pkg, index) => ({ pkg, index }));

  const sorted = withIndex.sort((a, b) => {
    const aLine = a.pkg.lineNo ?? Number.MAX_SAFE_INTEGER;
    const bLine = b.pkg.lineNo ?? Number.MAX_SAFE_INTEGER;
    if (aLine !== bLine) return aLine - bLine;

    const aCustoms = rank(a.pkg.customsStatus, customsOrder);
    const bCustoms = rank(b.pkg.customsStatus, customsOrder);
    if (aCustoms !== bCustoms) return aCustoms - bCustoms;

    const aCargo = rank(a.pkg.cargoStatus, cargoOrder);
    const bCargo = rank(b.pkg.cargoStatus, cargoOrder);
    if (aCargo !== bCargo) return aCargo - bCargo;

    return a.index - b.index;
  });

  const grouped = new Map<number | null, CargoPackageStuffingItem[]>();
  sorted.forEach(({ pkg }) => {
    const lineNo = pkg.lineNo ?? null;
    const list = grouped.get(lineNo) ?? [];
    list.push(pkg);
    grouped.set(lineNo, list);
  });

  return Array.from(grouped.entries()).map(([lineNo, items]) => ({ lineNo, packages: items }));
};
