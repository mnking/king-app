import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Printer, Package as PackageIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { usePackingList } from '@/features/packing-list/hooks/use-packing-lists';
import { cargoPackageHandoverApi } from '@/services/apiCargoPackageHandover';
import type { CargoPackageRecord } from '../types';
import type { PackingListListItem } from '@/features/packing-list/types';
import {
  useBookingOrdersByIds,
  usePackingListsByHblIds,
  useHandoverCargoPackages,
  useHandoverDestuffingPlans,
  handoverDestuffingPlansQueryKey,
} from '../hooks';
import { PrintPreviewModal } from './PrintPreviewModal';
import { HandoverModal } from './HandoverModal';
import { HandoverSidebar } from './HandoverSidebar';
import { HandoverDetails } from './HandoverDetails';
import { useAuth } from '@/features/auth/useAuth';

const handoverCompleteStatuses = new Set(['CHECKOUT']);

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');

const getConditionBadge = (status: CargoPackageRecord['conditionStatus']) => {
  switch (status) {
    case 'NORMAL':
      return { label: 'Condition: NORMAL', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' };
    case 'PACKAGE_DAMAGED':
      return { label: 'Condition: PACKAGE_DAMAGED', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' };
    case 'CARGO_DAMAGED':
      return { label: 'Condition: CARGO_DAMAGED', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200' };
    default:
      return { label: 'Condition: —', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-200' };
  }
};

const getRegulatoryBadge = (status: CargoPackageRecord['regulatoryStatus']) => {
  switch (status) {
    case 'PASSED':
      return { label: 'Regulatory: PASSED', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' };
    case 'ON_HOLD':
      return { label: 'Regulatory: ON_HOLD', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' };
    case 'UNINSPECTED':
      return { label: 'Regulatory: UNINSPECTED', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-200' };
    default:
      return { label: 'Regulatory: —', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-200' };
  }
};

const splitLocations = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const CargoPackageHandoverPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWriteHandover = can?.('cargo_package_handover:write') ?? false;
  const [selectedPackingListId, setSelectedPackingListId] = useState<string | null>(null);
  const [printPreview, setPrintPreview] = useState<CargoPackageRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'toHandover' | 'handedOver'>('toHandover');
  const [handoverModalPackage, setHandoverModalPackage] = useState<CargoPackageRecord | null>(null);
  const [handoverLocations, setHandoverLocations] = useState('');
  const [handoverNote, setHandoverNote] = useState('');
  const [handoverMetadata, setHandoverMetadata] = useState('');
  const [progressByPl, setProgressByPl] = useState<
    Record<string, { completedCount: number; totalTarget: number | string }>
  >({});

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: handoverDestuffingPlansQueryKey });
    queryClient.invalidateQueries({ queryKey: ['packing-lists-by-hbl-ids'] });
    queryClient.invalidateQueries({ queryKey: ['packing-lists'] });
    queryClient.invalidateQueries({ queryKey: ['cargo-packages-for-handover'] });
  }, [queryClient]);

  useEffect(() => {
    if (handoverModalPackage) {
      setHandoverLocations('');
      setHandoverNote('');
      setHandoverMetadata('');
    }
  }, [handoverModalPackage]);

  const {
    data: inProgressPlans,
    isLoading: isLoadingPlans,
    isError: isPlanError,
    error: planError,
  } = useHandoverDestuffingPlans();

  const eligibleHblIds = useMemo(() => {
    if (!inProgressPlans) return [];
    const ids = new Set<string>();
    inProgressPlans.forEach((plan) => {
      (plan.containers ?? []).forEach((container) => {
        (container.orderContainer?.hbls ?? []).forEach((hbl) => {
          if (hbl?.hblId) ids.add(hbl.hblId);
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
        (container.orderContainer?.hbls ?? []).forEach((hbl) => {
          if (hbl?.hblId) {
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

  const { data: packingListDetail, isLoading: isLoadingPackingListDetail } = usePackingList(selectedPackingListId ?? '', {
    enabled: Boolean(selectedPackingListId),
  });

  const selectedPackingList = useMemo(
    () => packingLists?.find((pl) => pl.id === selectedPackingListId),
    [packingLists, selectedPackingListId]
  );

  const {
    data: cargoPackages,
    isLoading: isLoadingPackages,
    isError: isPackageError,
    error: packageError,
  } = useHandoverCargoPackages(selectedPackingListId);

  const toHandoverPackages = useMemo(
    () => (cargoPackages ?? []).filter((pkg) => !handoverCompleteStatuses.has(pkg.positionStatus ?? '')),
    [cargoPackages],
  );
  const handedOverPackages = useMemo(
    () => (cargoPackages ?? []).filter((pkg) => handoverCompleteStatuses.has(pkg.positionStatus ?? '')),
    [cargoPackages],
  );

  const totalTarget = cargoPackages?.length ?? 0;
  const handedOverCount = handedOverPackages.length;
  const canCompleteHandover = totalTarget > 0 && handedOverCount === totalTarget;

  useEffect(() => {
    if (!selectedPackingListId) return;
    const entry = {
      completedCount: handedOverCount,
      totalTarget: totalTarget || '—',
    };
    setProgressByPl((prev) => ({ ...prev, [selectedPackingListId]: entry }));
  }, [selectedPackingListId, handedOverCount, totalTarget]);

  const closeHandoverModal = () => {
    setHandoverModalPackage(null);
    setHandoverLocations('');
    setHandoverNote('');
    setHandoverMetadata('');
  };

  const handoverPackages = useMutation({
    mutationFn: (payload: { packageId: string; toLocationId?: string[]; note?: string | null; metadata?: Record<string, unknown> }) =>
      cargoPackageHandoverApi.handover({ packages: [{ ...payload, note: payload.note ?? null, metadata: payload.metadata ?? {} }] }),
    onSuccess: () => {
      toast.success('Package handed over');
      queryClient.invalidateQueries({ queryKey: ['cargo-packages-for-handover', selectedPackingListId] });
      closeHandoverModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to hand over package');
    },
  });

  const handleHandoverSubmit = () => {
    if (!handoverModalPackage) return;
    if (!canWriteHandover) {
      toast.error('You do not have permission to hand over cargo packages.');
      return;
    }

    let metadataObj: Record<string, unknown> | undefined;
    const metadataInput = handoverMetadata.trim();
    if (metadataInput) {
      try {
        metadataObj = JSON.parse(metadataInput);
      } catch {
        toast.error('Metadata must be valid JSON');
        return;
      }
    }

    const locations = splitLocations(handoverLocations);
    const noteValue = handoverNote.trim();

    handoverPackages.mutate({
      packageId: handoverModalPackage.id,
      toLocationId: locations.length ? locations : undefined,
      note: noteValue || undefined,
      metadata: metadataObj,
    });
  };

  const handleSelectPackingList = async (id: string | null) => {
    if (id === selectedPackingListId) return;
    setSelectedPackingListId(id);
    setPrintPreview(null);
    setActiveTab('toHandover');
    if (id) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['packing-list', id] }),
        queryClient.invalidateQueries({ queryKey: ['cargo-packages-for-handover', id] }),
      ]);
    }
  };

  const renderPackageRow = (pkg: CargoPackageRecord, isHandedOver: boolean) => {
    const isHandingOver = handoverPackages.isPending && handoverPackages.variables?.packageId === pkg.id;
    const disableActions = isHandedOver || isPackageError || !canWriteHandover;
    const conditionBadge = getConditionBadge(pkg.conditionStatus ?? null);
    const regulatoryBadge = getRegulatoryBadge(pkg.regulatoryStatus ?? null);

    return (
      <div
        key={pkg.id}
        className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Package #{pkg.packageNo ?? pkg.id}</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
              Position: {pkg.positionStatus ?? '—'}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${regulatoryBadge.className}`}>
              {regulatoryBadge.label}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${conditionBadge.className}`}>
              {conditionBadge.label}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-200">
          Line: {pkg.lineNo ?? '—'} • Type: {pkg.packageType ?? '—'} • Description: {pkg.cargoDescription ?? '—'}
        </div>
        {!isHandedOver ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" disabled>
                <Printer className="mr-2 h-4 w-4" /> Print handover paper
              </Button>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                variant="primary"
                size="sm"
                disabled={disableActions}
                loading={isHandingOver}
                onClick={() => setHandoverModalPackage(pkg)}
              >
                <PackageIcon className="mr-2 h-4 w-4" /> Handover
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPrintPreview(pkg)}>
              <Printer className="mr-2 h-4 w-4" /> Print Label
            </Button>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Handed Over
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-full md:w-[420px] min-w-[360px] max-w-[520px] border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
        <HandoverSidebar
          packingLists={packingLists ?? []}
          selectedPackingListId={selectedPackingListId}
          onSelect={handleSelectPackingList}
          getBookingOrderCode={getBookingOrderCode}
          progressByPl={progressByPl}
          isLoadingPlans={isLoadingPlans}
          isLoadingPackingLists={isLoadingPackingLists}
          isPlanError={isPlanError}
          planError={planError ? getErrorMessage(planError) : null}
          isPackingListError={isPackingListError}
          packingListError={packingListError ? getErrorMessage(packingListError) : null}
          showNoEligiblePlans={eligibleHblIds.length === 0 && !isLoadingPlans}
        />
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900">
        <HandoverDetails
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
          toHandoverPackages={toHandoverPackages}
          handedOverPackages={handedOverPackages}
          canCompleteHandover={canCompleteHandover}
          renderPackageRow={renderPackageRow}
        />
      </div>

      <HandoverModal
        open={Boolean(handoverModalPackage)}
        packageRecord={handoverModalPackage}
        locations={handoverLocations}
        note={handoverNote}
        metadata={handoverMetadata}
        onLocationsChange={setHandoverLocations}
        onNoteChange={setHandoverNote}
        onMetadataChange={setHandoverMetadata}
        onCancel={closeHandoverModal}
        onSave={handleHandoverSubmit}
        isSaving={handoverPackages.isPending}
      />

      <PrintPreviewModal
        open={Boolean(printPreview)}
        onClose={() => setPrintPreview(null)}
        packingListDetail={packingListDetail}
        packageRecord={printPreview}
      />
    </div>
  );
};

export default CargoPackageHandoverPage;
