import type { CargoPackageStuffingItem, StatusSelection } from '../types';

export const buildSelections = (packages: CargoPackageStuffingItem[]) =>
  packages.reduce<Record<string, StatusSelection>>((acc, pkg) => {
    acc[pkg.id] = {
      cargoStatus: pkg.cargoStatus ?? null,
      customsStatus: pkg.customsStatus ?? null,
    };
    return acc;
  }, {});
