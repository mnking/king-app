import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Printer, QrCode } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { usePackingList } from '@/features/packing-list/hooks/use-packing-lists';
import type { PackingListListItem } from '@/features/packing-list/types';
import { useAuth } from '@/features/auth/useAuth';
import { cargoPackagesApi } from '@/services/apiCargoPackages';
import type {
  CargoPackageRecord,
  CargoPackageStorePayload,
} from '../types';
import {
  storageDestuffingPlansQueryKey,
  useBookingOrdersByIds,
  useLocationLookup,
  usePackingListsByHblIds,
  useStorageCargoPackages,
  useStorageDestuffingPlans,
} from '../hooks';
import { PackageStorageDetails, type StoredLocationSummaryItem } from './PackageStorageDetails';
import { PackingListSidebar } from './PackingListSidebar';
import { PrintPreviewModal } from './PrintPreviewModal';
import { StoreLocationsModal, type SelectedLocation } from './StoreLocationsModal';

const TO_STORE_STATUS = 'CHECK_IN';
const STORED_STATUS = 'STORED';
const MAX_BATCH_STORE_PACKAGES = 300;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

const getPackageSortKey = (pkg: CargoPackageRecord) =>
  pkg.packageNo?.trim() || pkg.id;

const comparePackagesByLineNo = (a: CargoPackageRecord, b: CargoPackageRecord) => {
  const aLine = typeof a.lineNo === 'number' ? a.lineNo : Number.MAX_SAFE_INTEGER;
  const bLine = typeof b.lineNo === 'number' ? b.lineNo : Number.MAX_SAFE_INTEGER;

  if (aLine !== bLine) {
    return aLine - bLine;
  }

  return getPackageSortKey(a).localeCompare(getPackageSortKey(b));
};

const parseBatchStoreQuantity = (input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

const validateBatchStoreQuantity = (
  quantity: number | null,
  eligibleCount: number,
): string | null => {
  if (eligibleCount === 0) {
    return 'No packages available in To Store.';
  }

  if (quantity === null || !Number.isInteger(quantity) || quantity < 1) {
    return 'Enter a quantity of at least 1 package.';
  }

  if (quantity > MAX_BATCH_STORE_PACKAGES) {
    return `Maximum ${MAX_BATCH_STORE_PACKAGES} packages per store request.`;
  }

  if (quantity > eligibleCount) {
    return `Only ${eligibleCount} package(s) currently available in To Store.`;
  }

  return null;
};

const getConditionBadge = (status: CargoPackageRecord['conditionStatus']) => {
  switch (status) {
    case 'NORMAL':
      return {
        label: 'Condition: NORMAL',
        className:
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
      };
    case 'PACKAGE_DAMAGED':
      return {
        label: 'Condition: PACKAGE_DAMAGED',
        className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
      };
    case 'CARGO_DAMAGED':
      return {
        label: 'Condition: CARGO_DAMAGED',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
      };
    default:
      return {
        label: 'Condition: —',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-200',
      };
  }
};

const getRegulatoryBadge = (status: CargoPackageRecord['regulatoryStatus']) => {
  switch (status) {
    case 'PASSED':
      return {
        label: 'Regulatory: PASSED',
        className:
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
      };
    case 'ON_HOLD':
      return {
        label: 'Regulatory: ON_HOLD',
        className:
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
      };
    case 'UNINSPECTED':
      return {
        label: 'Regulatory: UNINSPECTED',
        className:
          'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-200',
      };
    default:
      return {
        label: 'Regulatory: —',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-200',
      };
  }
};

export const CargoPackageStoragePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const canWritePackageStorage = can?.('cargo_package_store:write') ?? false;

  const [selectedPackingListId, setSelectedPackingListId] = useState<string | null>(null);
  const [printPreview, setPrintPreview] = useState<CargoPackageRecord | null>(null);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [batchStoreQuantityInput, setBatchStoreQuantityInput] = useState('');
  const [hasEditedBatchStoreQuantity, setHasEditedBatchStoreQuantity] = useState(false);
  const [batchStorePackageIds, setBatchStorePackageIds] = useState<string[]>([]);
  const [lastLocationSelection, setLastLocationSelection] = useState<SelectedLocation[]>([]);
  const [activeTab, setActiveTab] = useState<'toStore' | 'stored'>('toStore');
  const [isRefreshingSelectedPackingList, setIsRefreshingSelectedPackingList] = useState(false);
  const [storedProgressByPl, setStoredProgressByPl] = useState<
    Record<string, { storedCount: number; totalTarget: number | string; isComplete: boolean }>
  >({});

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: storageDestuffingPlansQueryKey });
    queryClient.invalidateQueries({ queryKey: ['packing-lists-by-hbl-ids'] });
    queryClient.invalidateQueries({ queryKey: ['packing-lists'] });
    queryClient.invalidateQueries({ queryKey: ['cargo-packages-for-storage'] });
  }, [queryClient]);

  const {
    data: inProgressPlans,
    isLoading: isLoadingPlans,
    isError: isPlanError,
    error: planError,
  } = useStorageDestuffingPlans();

  const eligibleHblIds = useMemo(() => {
    if (!inProgressPlans) return [];

    const ids = new Set<string>();
    inProgressPlans.forEach((plan) => {
      (plan.containers ?? []).forEach((container) => {
        (container.hbls ?? []).forEach((hbl) => {
          if (hbl.hblId) {
            ids.add(hbl.hblId);
          }
        });
      });
    });

    return Array.from(ids);
  }, [inProgressPlans]);

  const hblOrderIdMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!inProgressPlans) return map;

    inProgressPlans.forEach((plan) => {
      (plan.containers ?? []).forEach((container) => {
        const orderId = container.orderContainer?.orderId;
        if (!orderId) return;

        (container.hbls ?? []).forEach((hbl) => {
          if (hbl.hblId) {
            map.set(hbl.hblId, orderId);
          }
        });
      });
    });

    return map;
  }, [inProgressPlans]);

  const orderIds = useMemo(
    () => Array.from(new Set(Array.from(hblOrderIdMap.values()))),
    [hblOrderIdMap],
  );

  const { data: bookingOrderCodes = {} } = useBookingOrdersByIds(orderIds);

  const getBookingOrderCode = useCallback(
    (packingList: PackingListListItem) => {
      const hblId = packingList.hblData?.id;
      if (!hblId) return null;

      const orderId = hblOrderIdMap.get(hblId);
      if (!orderId) return null;

      return bookingOrderCodes[orderId] ?? null;
    },
    [bookingOrderCodes, hblOrderIdMap],
  );

  const {
    data: packingLists,
    isLoading: isLoadingPackingLists,
    isError: isPackingListError,
    error: packingListError,
  } = usePackingListsByHblIds(eligibleHblIds);

  useEffect(() => {
    if (!packingLists) return;

    const stillExists = packingLists.some((pl) => pl.id === selectedPackingListId);
    if (!stillExists) {
      setSelectedPackingListId(null);
    }
  }, [packingLists, selectedPackingListId]);

  const {
    data: packingListDetail,
    isLoading: isLoadingPackingListDetail,
    refetch: refetchPackingListDetail,
    dataUpdatedAt: packingListDetailUpdatedAt,
  } = usePackingList(selectedPackingListId ?? '', {
    enabled: Boolean(selectedPackingListId),
  });

  const selectedPackingList = useMemo(
    () => packingLists?.find((pl) => pl.id === selectedPackingListId),
    [packingLists, selectedPackingListId],
  );

  const {
    data: cargoPackages,
    isLoading: isLoadingPackages,
    isError: isPackageError,
    error: packageError,
    refetch: refetchCargoPackages,
    dataUpdatedAt: cargoPackagesUpdatedAt,
  } = useStorageCargoPackages(selectedPackingListId);

  const toStorePackages = useMemo(
    () => (cargoPackages ?? []).filter((pkg) => pkg.positionStatus === TO_STORE_STATUS),
    [cargoPackages],
  );

  const sortedToStorePackages = useMemo(
    () => toStorePackages.slice().sort(comparePackagesByLineNo),
    [toStorePackages],
  );

  const storedPackages = useMemo(
    () => (cargoPackages ?? []).filter((pkg) => pkg.positionStatus === STORED_STATUS),
    [cargoPackages],
  );

  const toStorePackageMap = useMemo(
    () => new Map(sortedToStorePackages.map((pkg) => [pkg.id, pkg])),
    [sortedToStorePackages],
  );

  const cargoPackageMap = useMemo(
    () => new Map((cargoPackages ?? []).map((pkg) => [pkg.id, pkg])),
    [cargoPackages],
  );

  const eligibleToStoreCount = sortedToStorePackages.length;

  useEffect(() => {
    if (!selectedPackingListId) {
      setBatchStoreQuantityInput('');
      setHasEditedBatchStoreQuantity(false);
      setBatchStorePackageIds([]);
      setStoreModalOpen(false);
      return;
    }

    if (!hasEditedBatchStoreQuantity) {
      const defaultQuantity = Math.min(eligibleToStoreCount, MAX_BATCH_STORE_PACKAGES);
      setBatchStoreQuantityInput(defaultQuantity > 0 ? String(defaultQuantity) : '');
    }
  }, [eligibleToStoreCount, hasEditedBatchStoreQuantity, selectedPackingListId]);

  const parsedBatchStoreQuantity = useMemo(
    () => parseBatchStoreQuantity(batchStoreQuantityInput),
    [batchStoreQuantityInput],
  );

  const batchStoreValidationError = useMemo(
    () => validateBatchStoreQuantity(parsedBatchStoreQuantity, eligibleToStoreCount),
    [eligibleToStoreCount, parsedBatchStoreQuantity],
  );

  const batchStorePackages = useMemo(
    () =>
      batchStorePackageIds.flatMap((packageId) => {
        const pkg = cargoPackageMap.get(packageId);
        return pkg ? [pkg] : [];
      }),
    [batchStorePackageIds, cargoPackageMap],
  );

  const storedLocationIds = useMemo(() => {
    const ids = new Set<string>();

    storedPackages.forEach((pkg) => {
      (pkg.currentLocationId ?? []).forEach((locationId) => {
        if (locationId) {
          ids.add(locationId);
        }
      });
    });

    return Array.from(ids);
  }, [storedPackages]);

  const { lookup: locationLookup, isFetching: isFetchingLocations } =
    useLocationLookup(storedLocationIds);

  const storedLocationSummary = useMemo<StoredLocationSummaryItem[]>(() => {
    const summaryMap = new Map<string, StoredLocationSummaryItem>();

    storedPackages.forEach((pkg) => {
      (pkg.currentLocationId ?? []).forEach((locationId) => {
        if (!locationId) return;

        const existing = summaryMap.get(locationId);
        if (existing) {
          existing.packageCount += 1;
          return;
        }

        const location = locationLookup.get(locationId);
        summaryMap.set(locationId, {
          locationId,
          displayCode: location?.displayCode ?? locationId,
          zoneName: location?.zoneName ?? 'Unknown zone',
          packageCount: 1,
        });
      });
    });

    return Array.from(summaryMap.values()).sort((a, b) => {
      if (a.packageCount !== b.packageCount) {
        return b.packageCount - a.packageCount;
      }
      return a.displayCode.localeCompare(b.displayCode);
    });
  }, [locationLookup, storedPackages]);

  const lastRefreshedAt = useMemo(() => {
    const maxUpdatedAt = Math.max(packingListDetailUpdatedAt ?? 0, cargoPackagesUpdatedAt ?? 0);
    return maxUpdatedAt > 0 ? maxUpdatedAt : null;
  }, [cargoPackagesUpdatedAt, packingListDetailUpdatedAt]);

  const totalTarget = cargoPackages?.length ?? 0;
  const storedCount = storedPackages.length;
  const isComplete = totalTarget > 0 && storedCount >= totalTarget;

  useEffect(() => {
    if (!selectedPackingListId) return;

    const entry = {
      storedCount,
      totalTarget: totalTarget || '—',
      isComplete,
    };

    setStoredProgressByPl((prev) => ({ ...prev, [selectedPackingListId]: entry }));
  }, [isComplete, selectedPackingListId, storedCount, totalTarget]);

  const generateCode = useMutation({
    mutationFn: (packageId: string) => cargoPackagesApi.generateCode(packageId),
    onSuccess: () => {
      toast.success('Package code generated');
      queryClient.invalidateQueries({
        queryKey: ['cargo-packages-for-storage', selectedPackingListId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate code');
    },
  });

  const storePackages = useMutation<void, Error, CargoPackageStorePayload>({
    mutationFn: (payload) => cargoPackagesApi.store(payload),
    onSuccess: (_data, variables) => {
      toast.success(`Stored ${variables.packages.length} package(s)`);
      queryClient.invalidateQueries({
        queryKey: ['cargo-packages-for-storage', selectedPackingListId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to store package batch');
    },
  });

  const handleBatchStoreQuantityInputChange = useCallback((nextValue: string) => {
    setHasEditedBatchStoreQuantity(true);
    if (nextValue === '') {
      setBatchStoreQuantityInput('');
      return;
    }

    const digitsOnly = nextValue.replace(/[^\d]/g, '');
    setBatchStoreQuantityInput(digitsOnly);
  }, []);

  const handleBatchStoreQuantityInputBlur = useCallback(() => {
    if (!batchStoreQuantityInput) return;
    const parsed = parseBatchStoreQuantity(batchStoreQuantityInput);
    if (parsed === null) {
      setBatchStoreQuantityInput('');
      return;
    }
    setBatchStoreQuantityInput(String(parsed));
  }, [batchStoreQuantityInput]);

  const handleOpenBatchStoreModal = useCallback(() => {
    if (!canWritePackageStorage) {
      toast.error('You do not have permission to modify package storage.');
      return;
    }

    const validationMessage = validateBatchStoreQuantity(
      parsedBatchStoreQuantity,
      eligibleToStoreCount,
    );

    if (validationMessage) {
      return;
    }

    const selectedPackages = sortedToStorePackages.slice(0, parsedBatchStoreQuantity ?? 0);
    if (!selectedPackages.length) {
      return;
    }

    setBatchStorePackageIds(selectedPackages.map((pkg) => pkg.id));
    setLastLocationSelection([]);
    setStoreModalOpen(true);
  }, [
    canWritePackageStorage,
    eligibleToStoreCount,
    parsedBatchStoreQuantity,
    sortedToStorePackages,
  ]);

  const handleCloseStoreModal = useCallback(() => {
    setStoreModalOpen(false);
    setBatchStorePackageIds([]);
  }, []);

  const handleStoreLocations = useCallback(
    async (locations: SelectedLocation[]) => {
      if (!canWritePackageStorage) {
        toast.error('You do not have permission to modify package storage.');
        return;
      }

      const selectedLocation = locations[0];
      if (!selectedLocation) {
        toast.error('Select a location to continue.');
        return;
      }

      const packagesToStore = batchStorePackageIds.flatMap((packageId) => {
        const pkg = toStorePackageMap.get(packageId);
        return pkg ? [pkg] : [];
      });

      if (!packagesToStore.length) {
        toast.error('No selected packages are currently eligible to store.');
        handleCloseStoreModal();
        return;
      }

      if (packagesToStore.length !== batchStorePackageIds.length) {
        toast.error(
          'Some selected packages are no longer in To Store. Please review and retry.',
        );
        handleCloseStoreModal();
        return;
      }

      try {
        await storePackages.mutateAsync({
          packages: packagesToStore.map((pkg) => ({
            packageId: pkg.id,
            toLocationId: [selectedLocation.id],
            note: null,
            metadata: {},
          })),
        });

        setLastLocationSelection([selectedLocation]);
        setHasEditedBatchStoreQuantity(false);
        handleCloseStoreModal();
      } catch {
        // Mutation error is surfaced by React Query onError.
      }
    },
    [
      batchStorePackageIds,
      canWritePackageStorage,
      handleCloseStoreModal,
      storePackages,
      toStorePackageMap,
    ],
  );

  const handleRefreshSelectedPackingList = useCallback(async () => {
    if (!selectedPackingListId) return;
    setIsRefreshingSelectedPackingList(true);
    try {
      await Promise.all([refetchPackingListDetail(), refetchCargoPackages()]);
      toast.success('Packing list data refreshed');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRefreshingSelectedPackingList(false);
    }
  }, [
    refetchCargoPackages,
    refetchPackingListDetail,
    selectedPackingListId,
  ]);

  const handleSelectPackingList = async (id: string | null) => {
    if (id === selectedPackingListId) return;

    setSelectedPackingListId(id);
    setPrintPreview(null);
    setStoreModalOpen(false);
    setBatchStorePackageIds([]);
    setBatchStoreQuantityInput('');
    setHasEditedBatchStoreQuantity(false);
    setLastLocationSelection([]);
    setActiveTab('toStore');

    if (!id) return;

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['packing-list', id] }),
      queryClient.invalidateQueries({ queryKey: ['cargo-packages-for-storage', id] }),
    ]);
  };

  const renderPackageRow = (pkg: CargoPackageRecord, isStored: boolean) => {
    const isGenerating = generateCode.isPending && generateCode.variables === pkg.id;
    const hasCode = Boolean(pkg.packageNo);
    const disableActions = isStored || isPackageError;
    const conditionBadge = getConditionBadge(pkg.conditionStatus ?? null);
    const regulatoryBadge = getRegulatoryBadge(pkg.regulatoryStatus ?? null);
    const locationIds = pkg.currentLocationId ?? [];

    const locationDetails = locationIds.flatMap((locationId) => {
      const location = locationLookup.get(locationId);
      return location ? [location] : [];
    });

    return (
      <div
        key={pkg.id}
        className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Package #{pkg.packageNo ?? pkg.id}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {!isStored && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
                Position: {pkg.positionStatus ?? '—'}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${regulatoryBadge.className}`}
            >
              {regulatoryBadge.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${conditionBadge.className}`}
            >
              {conditionBadge.label}
            </span>
          </div>
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-200">
          Line: {pkg.lineNo ?? '—'} • Type: {pkg.packageType ?? '—'} • Description:{' '}
          {pkg.cargoDescription ?? '—'}
        </div>

        {!isStored ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={hasCode || disableActions || isGenerating || !canWritePackageStorage}
              loading={isGenerating}
              onClick={() => {
                if (!canWritePackageStorage) {
                  toast.error('You do not have permission to modify package storage.');
                  return;
                }
                generateCode.mutate(pkg.id);
              }}
            >
              <QrCode className="mr-2 h-4 w-4" />
              {hasCode ? 'Code Generated' : 'Generate Code'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              disabled={!hasCode || disableActions}
              onClick={() => setPrintPreview(pkg)}
            >
              <Printer className="mr-2 h-4 w-4" /> Print Label
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPrintPreview(pkg)}>
              <Printer className="mr-2 h-4 w-4" /> Print Label
            </Button>

            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
              Position: {pkg.positionStatus ?? '—'}
            </span>

            <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-slate-200/70 bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Stored Location
              </span>
              {locationDetails.length > 0 ? (
                locationDetails.map((location) => (
                  <span
                    key={location.id}
                    className="inline-flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="font-mono text-slate-900 dark:text-slate-100">
                      {location.displayCode ?? '—'}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span
                      className="max-w-[160px] truncate font-medium"
                      title={location.zoneName ?? undefined}
                    >
                      {location.zoneName ?? '—'}
                    </span>
                  </span>
                ))
              ) : locationIds.length > 0 ? (
                <span className="text-slate-500 dark:text-slate-400">
                  {isFetchingLocations ? 'Loading location…' : 'Location unavailable'}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">No location recorded</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="w-full min-w-[360px] max-w-[520px] flex-col border-r border-gray-200 dark:border-gray-700 md:w-[420px]">
        <PackingListSidebar
          packingLists={packingLists ?? []}
          selectedPackingListId={selectedPackingListId}
          onSelect={handleSelectPackingList}
          getBookingOrderCode={getBookingOrderCode}
          storedProgressByPl={storedProgressByPl}
          isLoadingPlans={isLoadingPlans}
          isLoadingPackingLists={isLoadingPackingLists}
          isPlanError={isPlanError}
          planError={planError ? getErrorMessage(planError) : null}
          isPackingListError={isPackingListError}
          packingListError={packingListError ? getErrorMessage(packingListError) : null}
          showNoEligiblePlans={eligibleHblIds.length === 0 && !isLoadingPlans}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-gray-900">
        <PackageStorageDetails
          selectedPackingListId={selectedPackingListId}
          packingList={selectedPackingList}
          packingListDetail={packingListDetail}
          bookingOrderCode={selectedPackingList ? getBookingOrderCode(selectedPackingList) : null}
          isLoadingPackingListDetail={isLoadingPackingListDetail}
          cargoPackages={cargoPackages}
          isLoadingPackages={isLoadingPackages}
          isPackageError={isPackageError}
          packageError={packageError}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          toStorePackages={sortedToStorePackages}
          storedPackages={storedPackages}
          batchStoreQuantityInput={batchStoreQuantityInput}
          onBatchStoreQuantityInputChange={handleBatchStoreQuantityInputChange}
          onBatchStoreQuantityInputBlur={handleBatchStoreQuantityInputBlur}
          onOpenBatchStoreModal={handleOpenBatchStoreModal}
          batchStoreMaxSize={MAX_BATCH_STORE_PACKAGES}
          batchStoreValidationError={batchStoreValidationError}
          isBatchStoreSubmitting={storePackages.isPending}
          canWritePackageStorage={canWritePackageStorage}
          onRefreshSelectedPackingList={handleRefreshSelectedPackingList}
          isRefreshingSelectedPackingList={isRefreshingSelectedPackingList}
          lastRefreshedAt={lastRefreshedAt}
          storedLocationSummary={storedLocationSummary}
          renderPackageRow={renderPackageRow}
        />
      </div>

      <PrintPreviewModal
        open={Boolean(printPreview)}
        onClose={() => setPrintPreview(null)}
        packingListDetail={packingListDetail}
        packageRecord={printPreview}
      />

      <StoreLocationsModal
        open={storeModalOpen}
        packageRecords={batchStorePackages}
        packingListNumber={
          selectedPackingList?.packingListNumber ?? packingListDetail?.packingListNumber
        }
        hblCode={selectedPackingList?.hblData?.hblCode ?? packingListDetail?.hblData?.hblCode}
        initialSelection={lastLocationSelection}
        isSubmitting={storePackages.isPending}
        onClose={handleCloseStoreModal}
        onSubmit={handleStoreLocations}
      />
    </div>
  );
};

export default CargoPackageStoragePage;
