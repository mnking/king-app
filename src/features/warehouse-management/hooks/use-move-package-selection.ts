import { useCallback, useMemo, useState } from 'react';
import type { Location } from '@/features/zones-locations/types';
interface UseMovePackageSelectionParams {
  locations: Location[];
}

interface UseMovePackageSelectionResult {
  selectedLocations: Location[];
  filteredLocations: Location[];
  handleLocationSelect: (location: Location) => void;
  clearSelection: () => void;
  removeLocation: (locationId: string) => void;
  selectedZoneId: string | null;
}

export const useMovePackageSelection = ({
  locations,
}: UseMovePackageSelectionParams): UseMovePackageSelectionResult => {
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);

  const selectedZoneId = selectedLocations.length
    ? selectedLocations[0].zoneId
    : null;

  const handleLocationSelect = useCallback((location: Location) => {
    setSelectedLocations((current) => {
      if (current.some((item) => item.id === location.id)) {
        return current;
      }

      const currentZoneId = current[0]?.zoneId;
      if (currentZoneId && currentZoneId !== location.zoneId) {
        return current;
      }

      return [...current, location];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLocations([]);
  }, []);

  const removeLocation = useCallback((locationId: string) => {
    setSelectedLocations((current) =>
      current.filter((location) => location.id !== locationId),
    );
  }, []);

  const filteredLocations = useMemo(() => {
    if (!selectedZoneId) {
      return locations;
    }

    return locations.filter((location) => location.zoneId === selectedZoneId);
  }, [locations, selectedZoneId]);

  return {
    selectedLocations,
    filteredLocations,
    handleLocationSelect,
    clearSelection,
    removeLocation,
    selectedZoneId,
  };
};
