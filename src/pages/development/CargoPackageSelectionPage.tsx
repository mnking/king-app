import React, { useMemo } from 'react';
import { PackagePlus, Wand2, RefreshCw, AlertTriangle } from 'lucide-react';

import { CargoPackageSelection } from '@/shared/features/cargo-package-selection';
import { usePackingListOptions } from '@/shared/features/cargo-package-selection/hooks';
import type { PackingListSelectionItem } from '@/shared/features/cargo-package-selection/types';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

const badgeTone: Record<string, string> = {
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60',
  DONE: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60',
  DEFAULT: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
};

const CargoPackageSelectionPage: React.FC = () => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const {
    packingLists,
    isLoading: isLoadingPackingLists,
    isError: isPackingListError,
    error: packingListError,
    refetch: refetchPackingLists,
  } = usePackingListOptions(['IN_PROGRESS', 'DONE'], 100);

  React.useEffect(() => {
    if (!selectedId && packingLists.length > 0) {
      setSelectedId(packingLists[0].id);
    }
  }, [packingLists, selectedId]);

  const selectedPackingList: PackingListSelectionItem | null = useMemo(
    () => packingLists.find((pl) => pl.id === selectedId) ?? null,
    [packingLists, selectedId],
  );

  const plNumber = selectedPackingList?.packingListNumber ?? selectedPackingList?.id ?? '';
  const hblCode = selectedPackingList?.hblData?.hblCode ?? null;
  const status = selectedPackingList?.workingStatus ?? 'IN_PROGRESS';
  const statusClass = badgeTone[status] ?? badgeTone.DEFAULT;
  const containerNumber = selectedPackingList?.hblData?.containerNumber ?? null;
  const vessel = selectedPackingList?.hblData?.vessel ?? null;
  const voyage = selectedPackingList?.hblData?.voyage ?? null;
  const forwarderName = selectedPackingList?.hblData?.forwarderName ?? null;

  const renderHeader = () => {
    if (isLoadingPackingLists) {
      return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
          <LoadingSpinner />
          Loading packing lists...
        </div>
      );
    }

    if (isPackingListError) {
      const message = (packingListError as Error | undefined)?.message ?? 'Failed to load packing lists';
      return (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-800 shadow-sm dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-2">
            <div className="font-semibold">Could not load packing lists</div>
            <div>{message}</div>
            <button
              type="button"
              onClick={() => void refetchPackingLists()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-100 dark:text-slate-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!packingLists.length) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
          No packing lists found with working status IN_PROGRESS or DONE.
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="mb-1 flex items-center gap-2 text-blue-600">
              <span className="flex h-2 w-2 rounded-full bg-blue-600" />
              <p className="text-xs font-bold uppercase tracking-wider">Development Preview</p>
            </div>
            <div className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Cargo Package Selection
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Pick packages from STORED inventory and dispatch them. Select a packing list to load its cargo packages.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Wand2 className="h-4 w-4" />
            <span>Uses STORED / CHECKOUT statuses</span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="col-span-2 flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Select Packing List
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value || null)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {packingLists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.packingListNumber ?? pl.id} {pl.hblData?.hblCode ? `• HBL ${pl.hblData.hblCode}` : ''}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              Only packing lists with working status IN_PROGRESS or DONE are shown.
            </span>
          </label>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                {status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-700 dark:text-slate-200">PL</span>
              <span className="text-right text-slate-900 dark:text-slate-100">{plNumber || '—'}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">HBL</span>
              <span className="text-right text-slate-900 dark:text-slate-100">{hblCode ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {renderHeader()}

      {selectedPackingList ? (
        <CargoPackageSelection
          packingListId={selectedPackingList.id}
          plNumber={plNumber}
          hblNumber={hblCode}
          note={selectedPackingList.note ?? undefined}
          workingStatus={selectedPackingList.workingStatus}
          containerNumber={containerNumber}
          vessel={vessel}
          voyage={voyage}
          forwarderName={forwarderName}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
          Select a packing list to load cargo packages.
        </div>
      )}
    </div>
  );
};

export default CargoPackageSelectionPage;
