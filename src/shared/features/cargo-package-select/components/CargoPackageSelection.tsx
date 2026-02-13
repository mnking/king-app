import React from 'react';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/hooks';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import { zonesLocationsApi } from '@/services/apiZonesLocations';
import { useCargoPackageSelectData } from '../hooks';
import { CargoPackageSelectionHeader } from './CargoPackageSelectionHeader';
import {
  conditionBadge,
  formatStatusLabel,
  getPrimaryLocationId,
  groupPackagesByLocation,
  regulatoryBadge,
} from '../utils';
import type { CargoPackageSelectionProps, LocationGroup } from '../types';
import type {
  PackageTransaction,
  PackageTransactionPackage,
} from '@/features/cfs-cargo-package-delivery/types/package-transaction-types';

type LocationSummary = {
  id: string;
  displayCode?: string;
  locationCode?: string;
  zoneName?: string | null;
};

const Badge: React.FC<{ label: string; className: string }> = ({ label, className }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
  >
    {label}
  </span>
);

const LocationCard: React.FC<{
  group: LocationGroup;
  selected: Set<string>;
  onToggle: (pkgId: string, checked: boolean) => void;
  onToggleGroup: (group: LocationGroup, checked: boolean) => void;
  defaultOpen?: boolean;
  readOnly?: boolean;
}> = ({
  group,
  selected,
  onToggle,
  onToggleGroup,
  defaultOpen = false,
  readOnly = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen, group.key]);

  const selectedCount = group.items.filter((pkg) => selected.has(pkg.id)).length;
  const allSelected = group.items.length > 0 && selectedCount === group.items.length;
  const hasPartialSelection = selectedCount > 0 && !allSelected;

  const groupCheckboxRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!groupCheckboxRef.current) return;
    groupCheckboxRef.current.indeterminate = hasPartialSelection;
  }, [hasPartialSelection]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-800/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Location
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {group.locationName}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {group.items.length} package{group.items.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-300">
              Selected: {selectedCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3" onClick={(event) => event.stopPropagation()}>
          <label
            htmlFor={`group-select-${group.key}`}
            className="text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Select all
          </label>
          <input
            ref={groupCheckboxRef}
            id={`group-select-${group.key}`}
            type="checkbox"
            aria-label={`Select all packages in location ${group.locationName}`}
            checked={allSelected}
            disabled={readOnly}
            onChange={(event) => onToggleGroup(group, event.target.checked)}
            className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:checked:bg-blue-500"
          />
          <div
            className={`mt-1 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="mb-2 grid grid-cols-12 gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span className="col-span-4">Package</span>
            <span className="col-span-3">Condition</span>
            <span className="col-span-3">Regulatory</span>
            <span className="col-span-2 text-right">Select</span>
          </div>
          <div className="space-y-2">
            {group.items.map((pkg) => {
              const condition = conditionBadge(pkg.conditionStatus);
              const regulatory = regulatoryBadge(pkg.regulatoryStatus);
              return (
                <div
                  key={pkg.id}
                  className="grid grid-cols-12 items-center gap-3 rounded-xl border border-slate-100 bg-white/70 px-3 py-3 shadow-sm transition hover:border-blue-200 hover:shadow dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <label htmlFor={`select-${pkg.id}`} className="sr-only">
                    Select package {pkg.packageNo || pkg.id}
                  </label>
                  <div className="col-span-4 space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {pkg.packageNo || pkg.id}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatStatusLabel(pkg.packageType)}
                    </p>
                  </div>
                  <div className="col-span-3">
                    <Badge label={condition.label} className={condition.className} />
                  </div>
                  <div className="col-span-3">
                    <Badge label={regulatory.label} className={regulatory.className} />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <input
                      id={`select-${pkg.id}`}
                      aria-label={`Select package ${pkg.packageNo || pkg.id}`}
                      type="checkbox"
                      checked={selected.has(pkg.id)}
                      disabled={readOnly}
                      onChange={(event) => onToggle(pkg.id, event.target.checked)}
                      onClick={(event) => event.stopPropagation()}
                      className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:checked:bg-blue-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const CargoPackageSelect: React.FC<CargoPackageSelectionProps> = ({
  packingListId,
  plNumber,
  transactionId,
  availablePackagesStatus,
  pickedPackagesStatus,
  readOnly = false,
  hblNumber,
  note,
  workingStatus,
  containerNumber,
  vessel,
  voyage,
  onSelectionChange,
  onSubmitSuccess,
}) => {
  const toast = useToast();
  // Keep legacy UI paths behind switches so they can be restored quickly if needed.
  const showPackageTabs = false;
  const showPickedPackages = false;
  const enableAvailableCollapse = false;
  const showAvailablePackageList = false;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'picked'>('available');
  const [availableExpanded, setAvailableExpanded] = useState(false);

  const { availableQuery } = useCargoPackageSelectData(
    packingListId,
    availablePackagesStatus ?? 'STORED',
  );

  const transactionQuery = useQuery({
    queryKey: transactionId
      ? ['cargo-package-select', transactionId, 'transaction']
      : ['cargo-package-select', '_', 'transaction'],
    queryFn: async (): Promise<PackageTransaction> => {
      const response = await packageTransactionsApi.getById(transactionId ?? '');
      return response.data;
    },
    enabled: Boolean(transactionId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const selectedCount = selected.size;
  const availablePackagesRaw = useMemo(
    () => availableQuery.data?.results ?? [],
    [availableQuery.data?.results],
  );

  const pickedPackages = useMemo<PackageTransactionPackage[]>(() => {
    const packages = transactionQuery.data?.packages ?? [];
    if (!pickedPackagesStatus) return packages;
    return packages.filter((pkg) => pkg.positionStatus === pickedPackagesStatus);
  }, [pickedPackagesStatus, transactionQuery.data?.packages]);

  const availablePackages = useMemo(() => {
    if (pickedPackages.length === 0) return availablePackagesRaw;
    const pickedIds = new Set(pickedPackages.map((pkg) => pkg.id));
    return availablePackagesRaw.filter((pkg) => !pickedIds.has(pkg.id));
  }, [availablePackagesRaw, pickedPackages]);

  const totalPackages = (availableQuery.data?.total ?? 0) + pickedPackages.length;
  const totalPicked = pickedPackages.length;

  const locationIds = useMemo(() => {
    const ids = new Set<string>();
    availablePackages.forEach((pkg) => {
      const locationId = getPrimaryLocationId(pkg);
      if (locationId) {
        ids.add(locationId);
      }
    });
    return Array.from(ids);
  }, [availablePackages]);

  const locationsQuery = useQuery({
    queryKey: ['cargo-package-select', 'locations', locationIds],
    queryFn: async () => {
      const response = await zonesLocationsApi.locations.getAll({
        ids: locationIds,
        page: 1,
        itemsPerPage: Math.max(locationIds.length, 50),
      });
      return response.data.results as LocationSummary[];
    },
    enabled: locationIds.length > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const locationNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    (locationsQuery.data ?? []).forEach((location) => {
      if (!location.id) return;
      map.set(location.id, location.displayCode ?? location.locationCode ?? location.id);
    });
    return map;
  }, [locationsQuery.data]);

  const groupedAvailable = useMemo(
    () => groupPackagesByLocation(availablePackages, locationNameLookup),
    [availablePackages, locationNameLookup],
  );

  useEffect(() => {
    if (!availablePackages.length) {
      setSelected(new Set());
      return;
    }

    const availableIds = new Set(availablePackages.map((pkg) => pkg.id));
    setSelected((prev) => {
      const next = new Set(Array.from(prev).filter((id) => availableIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [availablePackages]);

  useEffect(() => {
    onSelectionChange?.({ selectedCount, totalPackages });
  }, [onSelectionChange, selectedCount, totalPackages]);

  const handleToggle = useCallback(
    (pkgId: string, checked: boolean) => {
      if (readOnly) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(pkgId);
        } else {
          next.delete(pkgId);
        }
        return next;
      });
    },
    [readOnly],
  );

  const handleToggleLocationGroup = useCallback(
    (group: LocationGroup, checked: boolean) => {
      if (readOnly) return;

      setSelected((prev) => {
        const next = new Set(prev);
        group.items.forEach((pkg) => {
          if (checked) {
            next.add(pkg.id);
          } else {
            next.delete(pkg.id);
          }
        });
        return next;
      });
    },
    [readOnly],
  );

  const resetSelection = () => setSelected(new Set());

  const selectedAvailableCount = useMemo(
    () =>
      availablePackages.reduce(
        (count, pkg) => (selected.has(pkg.id) ? count + 1 : count),
        0,
      ),
    [availablePackages, selected],
  );
  const allAvailableSelected =
    availablePackages.length > 0 && selectedAvailableCount === availablePackages.length;
  const partiallySelectedAvailable = selectedAvailableCount > 0 && !allAvailableSelected;

  const refetchAll = async () => {
    await Promise.all([
      availableQuery.refetch(),
      transactionId ? transactionQuery.refetch() : Promise.resolve(undefined),
      locationIds.length > 0 ? locationsQuery.refetch() : Promise.resolve(undefined),
    ]);
  };

  const pickMutation = useMutation({
    mutationFn: async () => {
      if (!transactionId) {
        throw new Error('Transaction is required to pick packages.');
      }
      const packageIds = Array.from(selected);
      setActionError(null);
      await packageTransactionsApi.update(transactionId, { packageIds });
      return packageIds;
    },
    onSuccess: async (packageIds) => {
      toast.success('Packages picked successfully.');
      resetSelection();
      await refetchAll();
      onSubmitSuccess?.({ selectedPackageIds: packageIds, totalPackages });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to pick packages';
      setActionError(message);
      toast.error(message);
    },
  });

  const isLoading = availableQuery.isLoading || transactionQuery.isLoading;
  const isFetching = availableQuery.isFetching || transactionQuery.isFetching;
  const hasError = availableQuery.isError || transactionQuery.isError || locationsQuery.isError;
  const pickDisabled =
    readOnly || selectedCount === 0 || pickMutation.isPending || isLoading || !transactionId;
  const errorMessage =
    (availableQuery.error as Error | undefined)?.message ||
    (transactionQuery.error as Error | undefined)?.message ||
    (locationsQuery.error as Error | undefined)?.message ||
    null;

  const emptyAvailable = !isLoading && availablePackages.length === 0;
  const selectAllAvailableRef = React.useRef<HTMLInputElement | null>(null);
  const isAvailableExpanded = enableAvailableCollapse ? availableExpanded : true;

  useEffect(() => {
    if (!selectAllAvailableRef.current) return;
    selectAllAvailableRef.current.indeterminate = partiallySelectedAvailable;
  }, [partiallySelectedAvailable]);

  useEffect(() => {
    if (!enableAvailableCollapse) {
      setAvailableExpanded(true);
      return;
    }

    if (activeTab === 'available') {
      setAvailableExpanded(false);
    }
  }, [activeTab, enableAvailableCollapse]);

  useEffect(() => {
    if (!showPickedPackages && activeTab === 'picked') {
      setActiveTab('available');
    }
  }, [activeTab, showPickedPackages]);

  const handleToggleAllAvailable = useCallback(
    (checked: boolean) => {
      if (readOnly) return;
      if (checked) {
        setSelected(new Set(availablePackages.map((pkg) => pkg.id)));
        return;
      }
      setSelected(new Set());
    },
    [availablePackages, readOnly],
  );

  const handleToggleAvailableExpanded = useCallback(() => {
    if (!enableAvailableCollapse) return;
    setAvailableExpanded((prev) => !prev);
  }, [enableAvailableCollapse]);

  const handleAvailableControlsKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enableAvailableCollapse) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setAvailableExpanded((prev) => !prev);
      }
    },
    [enableAvailableCollapse],
  );

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CargoPackageSelectionHeader
        plNumber={plNumber}
        hblNumber={hblNumber}
        workingStatus={workingStatus}
        containerNumber={containerNumber}
        vessel={vessel}
        voyage={voyage}
        totalPicked={totalPicked}
        selectedCount={selectedCount}
        availableCount={availablePackages.length}
        onRefresh={() => {
          void refetchAll();
        }}
        refreshing={isFetching}
        error={hasError ? errorMessage : null}
        note={note ?? null}
        showMetaRow={false}
      />

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-200">
          <AlertTriangle className="h-4 w-4" />
          {actionError}
        </div>
      )}

      {showPackageTabs ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="inline-flex gap-2 rounded-lg bg-white p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('available')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition ${
                activeTab === 'available'
                  ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
            >
              <span>AVAILABLE PACKAGES</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  activeTab === 'available'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                {availablePackages.length}
              </span>
            </button>
            {showPickedPackages ? (
              <button
                type="button"
                onClick={() => setActiveTab('picked')}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition ${
                  activeTab === 'picked'
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                <span>PICKED PACKAGES</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    activeTab === 'picked'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {totalPicked}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-800 shadow-sm dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-2">
            <div className="font-semibold">Failed to load cargo packages</div>
            <div>{errorMessage || 'Please retry.'}</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refetchAll();
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
            <LoadingSpinner size="lg" />
            <span>Loading cargo packages...</span>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'available' || !showPickedPackages ? (
            <div className="space-y-4">
              <div
                role={enableAvailableCollapse ? 'button' : undefined}
                tabIndex={enableAvailableCollapse ? 0 : undefined}
                aria-expanded={enableAvailableCollapse ? isAvailableExpanded : undefined}
                aria-controls={enableAvailableCollapse ? 'available-packages-list' : undefined}
                onClick={enableAvailableCollapse ? handleToggleAvailableExpanded : undefined}
                onKeyDown={enableAvailableCollapse ? handleAvailableControlsKeyDown : undefined}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition dark:border-slate-800 dark:bg-slate-900/50 ${
                  enableAvailableCollapse
                    ? 'hover:border-slate-300 dark:hover:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                    : ''
                }`}
              >
                <div
                  className="flex items-center gap-2"
                  onClick={
                    enableAvailableCollapse ? (event) => event.stopPropagation() : undefined
                  }
                >
                  <input
                    ref={selectAllAvailableRef}
                    id="select-all-available-packages"
                    type="checkbox"
                    checked={allAvailableSelected}
                    disabled={readOnly || availablePackages.length === 0}
                    onChange={(event) => handleToggleAllAvailable(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:checked:bg-blue-500"
                  />
                  <label
                    htmlFor="select-all-available-packages"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Select all available packages
                  </label>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    {availablePackages.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={pickMutation.isPending}
                    disabled={pickDisabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      pickMutation.mutate();
                    }}
                    className="font-semibold"
                  >
                    Pick ({selectedAvailableCount})
                  </Button>
                  {enableAvailableCollapse ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isAvailableExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  ) : null}
                </div>
              </div>

              {showAvailablePackageList && isAvailableExpanded && !emptyAvailable ? (
                <div id="available-packages-list" className="space-y-4">
                  {groupedAvailable.map((group) => (
                    <LocationCard
                      key={group.key}
                      group={group}
                      selected={selected}
                      onToggle={handleToggle}
                      onToggleGroup={handleToggleLocationGroup}
                      defaultOpen={false}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Picked Packages
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Packages currently associated with this transaction.
                </p>
              </div>
              {pickedPackages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  No picked packages yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {pickedPackages.map((pkg) => {
                    const condition = conditionBadge(pkg.conditionStatus);
                    const regulatory = regulatoryBadge(pkg.regulatoryStatus);

                    return (
                      <div
                        key={pkg.id}
                        data-testid={`picked-package-${pkg.id}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {pkg.packageNo || pkg.id}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Position
                              </span>
                              <Badge
                                label={formatStatusLabel(pkg.positionStatus)}
                                className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-900/30 dark:text-blue-200"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Condition
                              </span>
                              <Badge label={condition.label} className={condition.className} />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Regulatory
                              </span>
                              <Badge label={regulatory.label} className={regulatory.className} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CargoPackageSelect;
