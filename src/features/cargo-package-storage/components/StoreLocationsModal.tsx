import React from 'react';
import { Loader2, MapPin, Package as PackageIcon, Search, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useFocusTrap } from '@/shared/hooks';
import { toastAdapter } from '@/shared/services/toast';
import { useLocationsByZone } from '@/features/zones-locations/hooks/use-locations-query';
import { useZones } from '@/features/zones-locations/hooks/use-zones-query';
import type { Location, Zone } from '@/features/zones-locations/types';
import type { CargoPackageRecord } from '../types';

export interface SelectedLocation {
  id: string;
  displayCode: string;
  absoluteCode: string;
  zoneCode?: string;
  type: Location['type'];
  details?: string;
}

interface StoreLocationsModalProps {
  open: boolean;
  packageRecords: CargoPackageRecord[];
  packingListNumber?: string;
  hblCode?: string;
  initialSelection?: SelectedLocation[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (locations: SelectedLocation[]) => Promise<void> | void;
}

const getInitialSelectedLocation = (
  locations: SelectedLocation[],
): SelectedLocation | null => locations[0] ?? null;

const formatLocationDetails = (location: Location) => {
  if (location.type === 'RBS') {
    return [location.rbsRow, location.rbsBay, location.rbsSlot].filter(Boolean).join(' • ');
  }
  return location.customLabel ?? '';
};

const toSelectedLocation = (location: Location): SelectedLocation => ({
  id: location.id,
  displayCode: location.displayCode,
  absoluteCode: location.absoluteCode,
  zoneCode: location.zoneCode,
  type: location.type,
  details: formatLocationDetails(location),
});

export const StoreLocationsModal: React.FC<StoreLocationsModalProps> = ({
  open,
  packageRecords,
  packingListNumber,
  hblCode,
  initialSelection = [],
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [selectedZoneId, setSelectedZoneId] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [pagination, setPagination] = React.useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedLocation, setSelectedLocation] = React.useState<SelectedLocation | null>(() =>
    getInitialSelectedLocation(initialSelection),
  );

  const focusTrapRef = useFocusTrap(open);

  const { data: zonesData, isLoading: isLoadingZones } = useZones({
    status: 'active',
    itemsPerPage: 50,
  });
  const zones = React.useMemo(() => zonesData?.results ?? [], [zonesData]);
  const initialSelectionFirstId = initialSelection[0]?.id ?? '';

  React.useEffect(() => {
    if (open && zones.length && !selectedZoneId) {
      setSelectedZoneId(zones[0].id);
    }
  }, [open, selectedZoneId, zones]);

  React.useEffect(() => {
    if (!open) return;
    setSelectedLocation(getInitialSelectedLocation(initialSelection));
    setSearchTerm('');
    setValidationError(null);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    // Dependency intentionally keyed on first selection ID to avoid loops when callers pass fresh arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectionFirstId, open]);

  const {
    data: locationsData,
    isLoading: isLoadingLocations,
    isFetching: isFetchingLocations,
  } = useLocationsByZone(selectedZoneId, {
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    status: 'active',
  });

  const filteredLocations = React.useMemo(() => {
    const locations = locationsData?.results ?? [];
    const term = searchTerm.trim().toLowerCase();

    if (!term) return locations;

    return locations.filter((location) => {
      const fields = [
        location.displayCode,
        location.locationCode,
        location.absoluteCode,
        location.customLabel ?? '',
        location.rbsRow ?? '',
        location.rbsBay ?? '',
        location.rbsSlot ?? '',
        location.type ?? '',
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return fields.some((field) => field.includes(term));
    });
  }, [locationsData, searchTerm]);

  const selectLocation = (location: Location) => {
    setSelectedLocation(toSelectedLocation(location));
    setValidationError(null);
  };

  const removeSelectedLocation = (id: string) => {
    setSelectedLocation((prev) => (prev?.id === id ? null : prev));
  };

  const selectedList = React.useMemo(
    () => (selectedLocation ? [selectedLocation] : []),
    [selectedLocation],
  );

  if (!open || packageRecords.length === 0) return null;

  const totalCount = locationsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const isFirstPage = pagination.pageIndex === 0;
  const isLastPage = pagination.pageIndex + 1 >= totalPages;

  const handleSubmit = async () => {
    if (!selectedList.length) {
      setValidationError('Select a location');
      return;
    }

    setValidationError(null);
    await onSubmit(selectedList);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-modal-title"
        className="w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              id="store-modal-title"
              className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
            >
              <PackageIcon className="h-4 w-4 text-indigo-500" />
              Store {packageRecords.length} package(s)
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Selected location will be applied to all packages in this batch.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selectedList.length} location selected
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Packing List:</span>
            <span>{packingListNumber ?? '—'}</span>
            <span className="text-indigo-400">•</span>
            <span className="font-semibold">HBL:</span>
            <span>{hblCode ?? '—'}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-semibold">Packages:</span>
            <span className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-100">
              {packageRecords.length}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label
              htmlFor="zone-select"
              className="text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Zone
            </label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50">
              {isLoadingZones ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading zones...
                </div>
              ) : zones.length ? (
                <div className="flex flex-col gap-2">
                  <select
                    id="zone-select"
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-900"
                    value={selectedZoneId}
                    onChange={async (event) => {
                      const newZoneId = event.target.value;

                      if (selectedList.length > 0) {
                        const confirmed = await toastAdapter.confirm(
                          'Switching zones will clear your selected location. Continue?',
                          { intent: 'primary' },
                        );
                        if (!confirmed) return;
                      }

                      setSelectedZoneId(newZoneId);
                      setSelectedLocation(null);
                      setValidationError(null);
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                      setSearchTerm('');
                    }}
                  >
                    {zones.map((zone: Zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.code} — {zone.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Switching zones clears current selection.
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No active zones available.
                </div>
              )}
            </div>

            {selectedList.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
                <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Selected location
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedList.map((loc) => (
                    <span
                      key={loc.id}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200"
                    >
                      <MapPin className="h-3 w-3" /> {loc.displayCode}
                      <button
                        type="button"
                        className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-300"
                        onClick={() => removeSelectedLocation(loc.id)}
                        aria-label={`Remove ${loc.displayCode}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 md:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search locations by code, label, or RBS details"
                  disabled={!selectedZoneId}
                  className="w-full sm:w-80"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing active & unlocked locations only.
              </div>
            </div>

            <div className="min-h-[260px] rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
              {!selectedZoneId ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  Select a zone to view locations.
                </div>
              ) : isLoadingLocations ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading locations...
                </div>
              ) : filteredLocations.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredLocations.map((location) => {
                    const isSelected = selectedLocation?.id === location.id;

                    return (
                      <label
                        key={location.id}
                        className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 shadow-sm transition hover:border-indigo-300 dark:hover:border-indigo-500 ${
                          isSelected
                            ? 'border-indigo-500 bg-white ring-2 ring-indigo-200 dark:border-indigo-400 dark:bg-gray-900 dark:ring-indigo-500/40'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {location.displayCode}
                          </div>
                          <input
                            type="radio"
                            name="store-location"
                            className="h-4 w-4"
                            checked={isSelected}
                            onChange={() => selectLocation(location)}
                            aria-label={`Select ${location.displayCode}`}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {location.absoluteCode}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {location.type === 'RBS' ? 'RBS' : 'CUSTOM'} •{' '}
                          {formatLocationDetails(location) || '—'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          Zone {location.zoneCode ?? '—'}
                        </div>
                        {location.status && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-300">
                            Status: {location.status}
                          </div>
                        )}
                        {'available' in location && location.available !== undefined && (
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            Available:{' '}
                            {String((location as Record<string, unknown>).available)}
                          </div>
                        )}
                        {'capacity' in location && location.capacity !== undefined && (
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            Capacity:{' '}
                            {String((location as Record<string, unknown>).capacity)}
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No active/unlocked locations found.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Page {pagination.pageIndex + 1} of {totalPages} • Total {totalCount} locations
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="pageSize">
                  Page size
                </label>
                <select
                  id="pageSize"
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-900"
                  value={pagination.pageSize}
                  onChange={(event) =>
                    setPagination({
                      pageIndex: 0,
                      pageSize: Number(event.target.value) || 10,
                    })
                  }
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isFirstPage || isLoadingLocations || isFetchingLocations}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        pageIndex: Math.max(0, prev.pageIndex - 1),
                      }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isLastPage || isLoadingLocations || isFetchingLocations}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        pageIndex: Math.min(totalPages - 1, prev.pageIndex + 1),
                      }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            {validationError && (
              <div role="alert" className="text-sm text-red-600 dark:text-red-400">
                {validationError}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedList.length ? '1 location selected' : 'Select a location to continue.'}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              <PackageIcon className="mr-2 h-4 w-4" />
              Store {packageRecords.length} package(s) to selected location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreLocationsModal;
