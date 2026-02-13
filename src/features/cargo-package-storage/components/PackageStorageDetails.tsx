import React from 'react';
import {
  ArrowRight,
  Container as ContainerIcon,
  FileText,
  Package,
  RefreshCw,
  ShieldCheck,
  Ship,
} from 'lucide-react';
import type {
  PackingListDetail,
  PackingListListItem,
} from '@/features/packing-list/types';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import type { CargoPackageRecord } from '../types';
import { PackageTabs } from './PackageTabs';

export interface StoredLocationSummaryItem {
  locationId: string;
  displayCode: string;
  zoneName: string;
  packageCount: number;
}

interface PackageStorageDetailsProps {
  selectedPackingListId: string | null;
  packingList?: PackingListListItem;
  packingListDetail?: PackingListDetail;
  bookingOrderCode?: string | null;
  isLoadingPackingListDetail: boolean;
  cargoPackages?: CargoPackageRecord[];
  isLoadingPackages: boolean;
  isPackageError: boolean;
  packageError: unknown;
  activeTab: 'toStore' | 'stored';
  setActiveTab: (tab: 'toStore' | 'stored') => void;
  toStorePackages: CargoPackageRecord[];
  storedPackages: CargoPackageRecord[];
  batchStoreQuantityInput: string;
  onBatchStoreQuantityInputChange: (value: string) => void;
  onBatchStoreQuantityInputBlur: () => void;
  onOpenBatchStoreModal: () => void;
  batchStoreMaxSize: number;
  batchStoreValidationError: string | null;
  isBatchStoreSubmitting: boolean;
  canWritePackageStorage: boolean;
  onRefreshSelectedPackingList: () => void;
  isRefreshingSelectedPackingList: boolean;
  lastRefreshedAt: number | null;
  storedLocationSummary: StoredLocationSummaryItem[];
  renderPackageRow: (pkg: CargoPackageRecord, isStored: boolean) => React.ReactNode;
}

export const PackageStorageDetails: React.FC<PackageStorageDetailsProps> = ({
  selectedPackingListId,
  packingList,
  packingListDetail,
  bookingOrderCode,
  isLoadingPackingListDetail,
  cargoPackages,
  isLoadingPackages,
  isPackageError,
  packageError,
  activeTab,
  setActiveTab,
  toStorePackages,
  storedPackages,
  batchStoreQuantityInput,
  onBatchStoreQuantityInputChange,
  onBatchStoreQuantityInputBlur,
  onOpenBatchStoreModal,
  batchStoreMaxSize,
  batchStoreValidationError,
  isBatchStoreSubmitting,
  canWritePackageStorage,
  onRefreshSelectedPackingList,
  isRefreshingSelectedPackingList,
  lastRefreshedAt,
  storedLocationSummary,
}) => {
  const lastRefreshedLabel = React.useMemo(() => {
    if (!lastRefreshedAt) return '—';
    return new Date(lastRefreshedAt).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [lastRefreshedAt]);

  if (!selectedPackingListId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
        <div className="text-center">
          <Package className="mx-auto mb-4 h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">Select a Packing List</p>
          <p className="text-sm">
            Choose a packing list from the sidebar to view details
          </p>
        </div>
      </div>
    );
  }

  const hblData = packingList?.hblData ?? packingListDetail?.hblData;
  const packingListNumber =
    packingList?.packingListNumber ?? packingListDetail?.packingListNumber ?? 'Loading…';
  const forwarderName = hblData?.forwarderName ?? 'Forwarder';
  const orderCode = bookingOrderCode ?? '—';
  const shipper = hblData?.shipper ?? '—';
  const consignee = hblData?.consignee ?? '—';
  const containerNumber = hblData?.containerNumber ?? '—';
  const containerType = hblData?.containerType ?? null;
  const sealNumber = hblData?.sealNumber ?? '—';
  const hblCode = hblData?.hblCode ?? '—';

  const disableBatchStoreAction =
    !canWritePackageStorage ||
    isBatchStoreSubmitting ||
    Boolean(batchStoreValidationError) ||
    toStorePackages.length === 0;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="truncate font-bold text-xl text-gray-900 dark:text-white">
                  {packingListNumber}
                </h3>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onRefreshSelectedPackingList}
                  disabled={isRefreshingSelectedPackingList}
                  loading={isRefreshingSelectedPackingList}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isRefreshingSelectedPackingList ? 'animate-spin' : ''
                    }`}
                  />
                  Refresh
                </Button>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {isRefreshingSelectedPackingList
                    ? 'Refreshing selected packing list...'
                    : `Last refreshed: ${lastRefreshedLabel}`}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200">
                Order {orderCode}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <Ship className="h-3.5 w-3.5 flex-shrink-0" />
                <span title={forwarderName} className="truncate max-w-[220px]">
                  {forwarderName}
                </span>
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <span className="shrink-0 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Route
              </span>
              <span title={shipper} className="min-w-0 truncate font-medium">
                {shipper}
              </span>
              <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span title={consignee} className="min-w-0 truncate font-medium">
                {consignee}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/30 dark:text-indigo-200">
                <ContainerIcon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
                  Container
                </span>
                <span title={containerNumber} className="min-w-0 flex-1 truncate font-semibold tabular-nums">
                  {containerNumber}
                </span>
                {containerType && (
                  <span className="shrink-0 text-[10px] font-medium opacity-80">
                    ({containerType})
                  </span>
                )}
              </div>

              <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
                  Seal
                </span>
                <span title={sealNumber} className="min-w-0 flex-1 truncate font-semibold tabular-nums">
                  {sealNumber}
                </span>
              </div>

              <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-200">
                <Package className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
                  HBL
                </span>
                <span title={hblCode} className="min-w-0 flex-1 truncate font-semibold tabular-nums">
                  {hblCode}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 dark:bg-gray-900/50">
        {(isLoadingPackingListDetail || isLoadingPackages) && (
          <div className="flex items-center justify-center py-10">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading details…</span>
          </div>
        )}

        {isPackageError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100"
          >
            Failed to load cargo packages:{' '}
            {packageError instanceof Error ? packageError.message : 'Unknown error'}. If
            empty, destuff/inspection may not be done yet.
          </div>
        )}

        {cargoPackages &&
        cargoPackages.length === 0 &&
        !isPackageError &&
        !isLoadingPackages ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100"
          >
            No cargo packages found. Destuff/inspection may not be completed.
          </div>
        ) : null}

        {!isLoadingPackingListDetail && !isLoadingPackages && (
          <PackageTabs
            activeTab={activeTab}
            onTabChange={(key) => setActiveTab(key as 'toStore' | 'stored')}
            tabs={[
              {
                key: 'toStore',
                label: 'To Store',
                count: toStorePackages.length,
                content: (
                  <div className="space-y-4">
                    <div
                      className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-900/20"
                    >
                      <div className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                            Batch Store Packages
                          </div>
                        </div>
                        <div className="text-xs font-medium text-indigo-800 dark:text-indigo-200">
                          Eligible: {toStorePackages.length}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-1">
                          <div className="text-sm text-indigo-700 dark:text-indigo-200">
                            Select how many packages to store, then choose locations once for the
                            whole batch.
                          </div>
                          <div className="text-xs text-indigo-700/90 dark:text-indigo-200/90">
                            Max per request: {batchStoreMaxSize}
                          </div>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
                          <div className="w-full sm:w-44">
                            <div
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <label
                                htmlFor="batch-store-quantity"
                                className="mb-1 block text-xs font-semibold text-indigo-900 dark:text-indigo-100"
                              >
                                Packages to store
                              </label>
                              <Input
                                id="batch-store-quantity"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={batchStoreQuantityInput}
                                onChange={(event) =>
                                  onBatchStoreQuantityInputChange(event.target.value)
                                }
                                onBlur={onBatchStoreQuantityInputBlur}
                                placeholder="Enter quantity"
                                disabled={!canWritePackageStorage || isBatchStoreSubmitting}
                              />
                            </div>
                          </div>
                          <div
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <Button
                              variant="primary"
                              onClick={onOpenBatchStoreModal}
                              loading={isBatchStoreSubmitting}
                              disabled={disableBatchStoreAction}
                            >
                              Store Selected Batch
                            </Button>
                          </div>
                        </div>
                      </div>

                      {batchStoreValidationError && (
                        <div
                          role="alert"
                          className="mt-2 text-sm text-red-600 dark:text-red-400"
                        >
                          {batchStoreValidationError}
                        </div>
                      )}

                      {!canWritePackageStorage && (
                        <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                          You do not have permission to modify package storage.
                        </div>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'stored',
                label: 'Stored',
                count: storedPackages.length,
                content: (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                      <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                        Stored Summary by Location
                      </div>
                      {storedLocationSummary.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {storedLocationSummary.map((summary) => {
                            return (
                              <span
                                key={summary.locationId}
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                              >
                                {summary.displayCode} • {summary.packageCount} packages
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
                          No location data available yet.
                        </div>
                      )}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
};
