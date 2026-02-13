import { useMemo, useRef, useState, useCallback } from 'react';
import { Archive, Lock, Package } from 'lucide-react';
import { useLocations } from './use-locations-query';
import { useWarehousePackages } from './use-warehouse-packages-query';

export const usePackageFirstPanel = () => {
  const [showStatCards, setShowStatCards] = useState(true);
  const [totalPackages, setTotalPackages] = useState(0);
  const hasTotalPackagesRef = useRef(false);
  const { data: lockedLocationsData } = useLocations({
    page: 1,
    itemsPerPage: 1,
    status: 'locked',
  });
  const { data: warehousePackagesData } = useWarehousePackages({
    page: 1,
    itemsPerPage: 1,
  });
  const { data: occupiedSingleData } = useLocations({
    page: 1,
    itemsPerPage: 1,
    packageCount: '1',
  });
  const { data: occupiedManyData } = useLocations({
    page: 1,
    itemsPerPage: 1,
    packageCount: 'many',
  });

  const lockedLocations = lockedLocationsData?.total ?? 0;
  const occupiedLocations =
    (occupiedSingleData?.total ?? 0) + (occupiedManyData?.total ?? 0);
  const totalCargoPackages = warehousePackagesData?.total ?? 0;
  const stats = useMemo(
    () => [
      {
        title: 'Total cargo packages',
        hint: 'Cargo packages tracked in the facility.',
        icon: Package,
        value: totalCargoPackages,
      },
      {
        title: 'Total packing lists',
        hint: 'Packing lists tracked in the facility.',
        icon: Package,
        value: totalPackages,
      },
      {
        title: 'Locked locations',
        hint: 'Locations blocked for use.',
        icon: Lock,
        value: lockedLocations,
      },
      {
        title: 'Occupied locations',
        hint: 'Locations currently holding goods.',
        icon: Archive,
        value: occupiedLocations,
      },
    ],
    [lockedLocations, occupiedLocations, totalCargoPackages, totalPackages],
  );

  const setTotalPackagesOnce = useCallback((total: number) => {
    if (hasTotalPackagesRef.current) {
      return;
    }
    setTotalPackages(total);
    hasTotalPackagesRef.current = true;
  }, []);

  return {
    showStatCards,
    toggleStats: () => setShowStatCards((prev) => !prev),
    stats,
    lockedLocations,
    occupiedLocations,
    totalCargoPackages,
    totalPackages,
    setTotalPackages: setTotalPackagesOnce,
  };
};
