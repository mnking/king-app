import React from 'react';
import { MapPin, Search, X, Loader2, Package as PackageIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useFocusTrap } from '@/shared/hooks';
import { toastAdapter } from '@/shared/services/toast';
import { useZones } from '@/features/zones-locations/hooks/use-zones-query';
import { useLocationsByZone } from '@/features/zones-locations/hooks/use-locations-query';
import type { Location, Zone } from '@/features/zones-locations/types';
import type { CargoPackageRecord } from '@/features/cargo-package-storage/types';

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
  packageRecord: CargoPackageRecord | null;
  initialSelection?: SelectedLocation[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (locations: SelectedLocation[]) => Promise<void> | void;
}

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
  packageRecord,
  initialSelection = [],
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [selectedZoneId, setSelectedZoneId] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [pagination, setPagination] = React.useState<{ pageIndex: number; pageSize: number }>({ pageIndex: 0, pageSize: 10 });
  const [selectedLocations, setSelectedLocations] = React.useState<Record<string, SelectedLocation>>(
    () => initialSelection.reduce((acc, loc) => ({ ...acc, [loc.id]: loc }), {}),
  );

  const focusTrapRef = useFocusTrap(open);

  const { data: zonesData, isLoading: isLoadingZones } = useZones({ status: 'active', itemsPerPage: 50 });
  const zones = React.useMemo(() => zonesData?.results ?? [], [zonesData]);
  const initialSelectionKey = React.useMemo(
    () => initialSelection.map((loc) => loc.id).sort().join('|'),
    [initialSelection]
  );

  React.useEffect(() => {
    if (open && zones.length && !selectedZoneId) {
      setSelectedZoneId(zones[0].id);
    }
  }, [open, zones, selectedZoneId]);

  React.useEffect(() => {
    if (!open) return;
    setSelectedLocations(initialSelection.reduce((acc, loc) => ({ ...acc, [loc.id]: loc }), {}));
    setSearchTerm('');
    setValidationError(null);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    // Dependency intentionally keyed on selection IDs to avoid loops when callers pass fresh arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSelectionKey]);

  const { data: locationsData, isLoading: isLoadingLocations, isFetching: isFetchingLocations } = useLocationsByZone(
    selectedZoneId,
    {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      status: 'active',
    },
  );

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

  const toggleLocation = (location: Location) => {
    setSelectedLocations((prev) => {
      if (prev[location.id]) {
        const { [location.id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [location.id]: toSelectedLocation(location) };
    });
    setValidationError(null);
  };

  const removeSelectedLocation = (id: string) => {
    setSelectedLocations((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const selectedList = React.useMemo(() => Object.values(selectedLocations), [selectedLocations]);

  if (!open || !packageRecord) return null;

  const totalCount = locationsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const isFirstPage = pagination.pageIndex === 0;
  const isLastPage = pagination.pageIndex + 1 >= totalPages;

  const handleSubmit = async () => {
    if (!selectedList.length) {
      setValidationError('Select at least one location');
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
            <div id="store-modal-title" className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <PackageIcon className="h-4 w-4 text-indigo-500" /> Store Package #{packageRecord.packageNo ?? packageRecord.id}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Select active, unlocked locations to store this package.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">{selectedList.length} selected in zone</div>
            {/* <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button> */}
            <button
              type="button"
              onClick={onClose}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="zone-select" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Zone</label>
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
                    onChange={async (e) => {
                      const newZoneId = e.target.value;
                      // If user has selections, confirm before switching zones
                      if (selectedList.length > 0) {
                        const confirmed = await toastAdapter.confirm(
                          `Switching zones will clear your current ${selectedList.length} location selection(s). Continue?`,
                          { intent: 'primary' }
                        );
                        if (!confirmed) return;
                      }
                      setSelectedZoneId(newZoneId);
                      setSelectedLocations({});
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">Switching zones clears current selections.</div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No active zones available.</div>
              )}
            </div>
            {selectedList.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
                <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">Selected locations</div>
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

          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search locations by code, label, or RBS details"
                  disabled={!selectedZoneId}
                  className="w-full sm:w-80"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing active & unlocked locations only. Per zone selection.
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
                    const isSelected = Boolean(selectedLocations[location.id]);
                    return (
                      <label
                        key={location.id}
                        className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 shadow-sm transition hover:border-indigo-300 dark:hover:border-indigo-500 ${isSelected
                          ? 'border-indigo-500 bg-white ring-2 ring-indigo-200 dark:border-indigo-400 dark:bg-gray-900 dark:ring-indigo-500/40'
                          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{location.displayCode}</div>
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={isSelected}
                            onChange={() => toggleLocation(location)}
                            aria-label={`Select ${location.displayCode}`}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{location.absoluteCode}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {location.type === 'RBS' ? 'RBS' : 'CUSTOM'} • {formatLocationDetails(location) || '—'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">Zone {location.zoneCode ?? '—'}</div>
                        {location.status && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-300">Status: {location.status}</div>
                        )}
                        {'available' in location && location.available !== undefined && (
                          <div className="text-xs text-gray-600 dark:text-gray-300">Available: {String((location as Record<string, unknown>).available)}</div>
                        )}
                        {'capacity' in location && location.capacity !== undefined && (
                          <div className="text-xs text-gray-600 dark:text-gray-300">Capacity: {String((location as Record<string, unknown>).capacity)}</div>
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
                <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="pageSize">Page size</label>
                <select
                  id="pageSize"
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-900"
                  value={pagination.pageSize}
                  onChange={(e) =>
                    setPagination({ pageIndex: 0, pageSize: Number(e.target.value) || 10 })
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
                    onClick={() => setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isLastPage || isLoadingLocations || isFetchingLocations}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, pageIndex: Math.min(totalPages - 1, prev.pageIndex + 1) }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            {validationError && (
              <div role="alert" className="text-sm text-red-600 dark:text-red-400">{validationError}</div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedList.length ? `${selectedList.length} location(s) selected` : 'Select at least one location to continue.'}
          </div>
          <div className="flex gap-2">
            {/* <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button> */}
            <Button variant="primary" onClick={handleSubmit} loading={isSubmitting} disabled={isSubmitting}>
              <PackageIcon className="mr-2 h-4 w-4" /> Store to selected locations
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreLocationsModal;
