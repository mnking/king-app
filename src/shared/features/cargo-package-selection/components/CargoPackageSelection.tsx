import React from 'react';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/hooks';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import { useCargoPackageSelectionData } from '../hooks';
import { CargoPackageSelectionHeader } from './CargoPackageSelectionHeader';

import {
  conditionBadge,
  formatStatusLabel,
  groupPackagesByLine,
  regulatoryBadge,
} from '../utils';
import type {
  CargoPackageSelectionProps,
  LineGroup,
} from '../types';
import type {
  PackageTransaction,
  PackageTransactionPackage,
} from '@/features/cfs-cargo-package-delivery/types/package-transaction-types';

const Badge: React.FC<{ label: string; className: string }> = ({ label, className }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
    {label}
  </span>
);

const LineCard: React.FC<{
  group: LineGroup;
  selected: Set<string>;
  onToggle: (pkgId: string, checked: boolean) => void;
  defaultOpen?: boolean;
  readOnly?: boolean;
}> = ({ group, selected, onToggle, defaultOpen = false, readOnly = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen, group.key]);

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
            Line {group.lineNo ?? '—'}
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {group.cargoDescription ?? 'Cargo description unavailable'}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {group.packageType || 'PKG'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {group.items.length} package{group.items.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className={`mt-1 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronDown className="h-5 w-5" />
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
                      onChange={(e) => onToggle(pkg.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
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

export const CargoPackageSelection: React.FC<CargoPackageSelectionProps> = ({
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
  forwarderName,
  onSelectionChange,
  onSubmitSuccess,
}) => {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'picked'>('available');

  const { availableQuery } = useCargoPackageSelectionData(
    packingListId,
    availablePackagesStatus ?? 'STORED',
  );

  const transactionQuery = useQuery({
    queryKey: transactionId
      ? ['cargo-package-selection', transactionId, 'transaction']
      : ['cargo-package-selection', '_', 'transaction'],
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

  const groupedAvailable = useMemo(
    () => groupPackagesByLine(availablePackages),
    [availablePackages],
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
    onSelectionChange?.({
      selectedCount,
      totalPackages,
    });
  }, [onSelectionChange, selectedCount, totalPackages]);

  const handleToggle = useCallback((pkgId: string, checked: boolean) => {
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
  }, [readOnly]);

  const resetSelection = () => setSelected(new Set());

  const refetchAll = async () => {
    await Promise.all([
      availableQuery.refetch(),
      transactionId ? transactionQuery.refetch() : Promise.resolve(undefined),
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
      onSubmitSuccess?.({
        selectedPackageIds: packageIds,
        totalPackages,
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to pick packages';
      setActionError(message);
      toast.error(message);
    },
  });

  const isLoading = availableQuery.isLoading || transactionQuery.isLoading;
  const isFetching = availableQuery.isFetching || transactionQuery.isFetching;
  const hasError = availableQuery.isError || transactionQuery.isError;
  const errorMessage =
    (availableQuery.error as Error | undefined)?.message ||
    (transactionQuery.error as Error | undefined)?.message ||
    null;

  const emptyAvailable = !isLoading && availablePackages.length === 0;
  const availableStatusLabel = availablePackagesStatus ?? 'STORED';

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CargoPackageSelectionHeader
        plNumber={plNumber}
        hblNumber={hblNumber}
        workingStatus={workingStatus}
        containerNumber={containerNumber}
        vessel={vessel}
        voyage={voyage}
        forwarderName={forwarderName}
        totalPicked={totalPicked}
        selectedCount={selectedCount}
        availableCount={availablePackages.length}
        onPick={() => pickMutation.mutate()}
        pickLoading={pickMutation.isPending}
        pickDisabled={
          readOnly || selectedCount === 0 || pickMutation.isPending || isLoading || !transactionId
        }
        onRefresh={() => void refetchAll()}
        refreshing={isFetching}
        error={hasError ? errorMessage : null}
        note={note ?? null}
      />

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-200">
          <AlertTriangle className="h-4 w-4" />
          {actionError}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="inline-flex gap-2 rounded-lg bg-white p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition ${activeTab === 'available'
              ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            <span>AVAILABLE PACKAGES</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === 'available'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40'
              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
            }`}>
              {availablePackages.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('picked')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition ${activeTab === 'picked'
              ? 'bg-emerald-50 text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            <span>PICKED PACKAGES</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === 'picked'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
            }`}>
              {totalPicked}
            </span>
          </button>
        </div>
      </div>

      {hasError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-800 shadow-sm dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-2">
            <div className="font-semibold">Failed to load cargo packages</div>
            <div>{errorMessage || 'Please retry.'}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void refetchAll()}>
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
          {activeTab === 'available' ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Available Packages
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Select any package in {availableStatusLabel} status. Condition and regulatory badges help you spot risks.
                </p>
              </div>
              {emptyAvailable ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  No available packages in {availableStatusLabel}.
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedAvailable.map((group, index) => (
                    <LineCard
                      key={group.key}
                      group={group}
                      selected={selected}
                      onToggle={handleToggle}
                      defaultOpen={index === 0}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              )}
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

export default CargoPackageSelection;
