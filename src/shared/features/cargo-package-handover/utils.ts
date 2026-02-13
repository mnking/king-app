import type {
  CargoPackageCheckItem,
  StatusSelection,
} from './types';

export interface CheckedLineGroup {
  lineNo: number | null;
  packages: CargoPackageCheckItem[];
}

export function groupCheckedByLine(
  packages: CargoPackageCheckItem[],
): CheckedLineGroup[] {
  const sorted = [...packages].sort((a, b) => {
    const aLine = a.lineNo ?? Number.MAX_SAFE_INTEGER;
    const bLine = b.lineNo ?? Number.MAX_SAFE_INTEGER;
    if (aLine !== bLine) return aLine - bLine;

    const aDate = a.checkedDate ? new Date(a.checkedDate).getTime() : 0;
    const bDate = b.checkedDate ? new Date(b.checkedDate).getTime() : 0;
    if (aDate !== bDate) return aDate - bDate;

    const aPkg = a.packageNo ?? '';
    const bPkg = b.packageNo ?? '';
    return aPkg.localeCompare(bPkg, undefined, { numeric: true, sensitivity: 'base' });
  });

  const grouped = new Map<number | null, CargoPackageCheckItem[]>();
  sorted.forEach(pkg => {
    const lineNo = pkg.lineNo ?? null;
    const list = grouped.get(lineNo) ?? [];
    list.push(pkg);
    grouped.set(lineNo, list);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    })
    .map(([lineNo, linePackages]) => ({ lineNo, packages: linePackages }));
}

export function buildSelections(
  packages: CargoPackageCheckItem[],
): Record<string, StatusSelection> {
  return packages.reduce<Record<string, StatusSelection>>((acc, pkg) => {
    acc[pkg.id] = {
      cargoStatus: pkg.cargoStatus ?? null,
      customsStatus: pkg.customsStatus ?? null,
    };
    return acc;
  }, {});
}
