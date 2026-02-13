import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/ui';
import { useToast } from '@/shared/hooks';

import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import { cargoPackagesApi } from '@/services/apiCargoPackages';
import type { CargoPackageRecord, PositionStatus } from '@/features/cargo-package-storage/types';
import { fetchMockCargoPackageData } from '../mockData';
import { groupCheckedByLine } from '../utils';
import {
  CargoStatus,
  CustomsStatus,
  type CargoPackageCheckFlow,
  type CargoPackageCheckItem,
} from '../types';
import { CargoPackageCheckHeader } from './parts/CargoPackageCheckHeader';
import { InspectionQueue } from './parts/InspectionQueue';
import { CompletedTable } from './parts/CompletedTable';

// Distinctive Technical Chip
const InfoChip: React.FC<{ label: string; value: string; tone?: 'neutral' | 'amber' | 'green' }> = ({ label, value, tone = 'neutral' }) => {
  const styles = {
    neutral: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
  };

  return (
    <div className={`flex items-baseline gap-2 rounded-md border px-3 py-1 font-mono text-sm leading-tight ${styles[tone]}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
};

export interface CargoPackageCheckProps {
  embedded?: boolean;
  packingListId?: string | null;
  packingListLabel?: string | null;
  hblNumber?: string | null;
  packageTransactionId?: string | null;
  handoverQueueStatus?: PositionStatus | null;
  handoverCompletedStatus?: PositionStatus | null;
  readOnly?: boolean;
  onTransactionUpdated?: () => void | Promise<void>;
}

export const CargoPackageCheck: React.FC<CargoPackageCheckProps> = ({
  embedded = false,
  packingListId = null,
  packingListLabel,
  hblNumber,
  packageTransactionId = null,
  handoverQueueStatus = null,
  handoverCompletedStatus = null,
  readOnly = false,
  onTransactionUpdated,
}) => {
  const toast = useToast();
  // Keep legacy UI paths behind switches so they can be restored quickly if needed.
  const showCheckTabs = false;
  const showCompletedLog = false;
  const enableQueueCollapse = false;
  const showQueuePackageList = false;

  const [flow, setFlow] = React.useState<CargoPackageCheckFlow | null>(null);
  const [packages, setPackages] = React.useState<CargoPackageCheckItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'queue' | 'completed'>('queue');
  const [queueExpanded, setQueueExpanded] = React.useState(false);
  const [selectedQueueIds, setSelectedQueueIds] = React.useState<Set<string>>(new Set());

  const headerHbl = React.useMemo(
    () =>
      hblNumber?.trim() ||
      packages.find((pkg) => pkg.hblNumber)?.hblNumber ||
      flow?.hblNumber ||
      null,
    [flow?.hblNumber, hblNumber, packages],
  );

  const parseLineNo = React.useCallback((value: unknown): number | null => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }, []);

  const fetchAllCargoPackages = React.useCallback(async (id: string) => {
    const itemsPerPage = 1000;
    const results: CargoPackageRecord[] = [];

    for (let page = 1; page <= 50; page += 1) {
      const pageResults = await cargoPackagesApi.getAll(id, page, itemsPerPage);
      results.push(...pageResults);
      if (pageResults.length < itemsPerPage) break;
    }

    return results;
  }, []);

  const loadPackages = React.useCallback(async (isRefresh = false) => {
    setError(null);
    setRefreshing(isRefresh);
    setLoading(prev => (isRefresh ? prev : true));

    try {
      if (packageTransactionId) {
        const transactionResponse = await packageTransactionsApi.getById(packageTransactionId);
        const transaction = transactionResponse.data;
        const queueStatus = handoverQueueStatus ?? 'CHECK_IN';
        const completedStatus = handoverCompletedStatus ?? 'CHECKOUT';

        const transactionPackages = transaction.packages ?? [];
        const queuePackages = transactionPackages.filter((pkg) => pkg.positionStatus === queueStatus);
        const completedPackages = transactionPackages.filter((pkg) => pkg.positionStatus === completedStatus);

        const resolvedPackingListId = packingListId ?? transaction.packingListId ?? '';
        const packageMap: Record<string, CargoPackageRecord> = {};
        const lineNoMap: Record<string, number | null> = {};

        if (resolvedPackingListId) {
          const packageResults = await fetchAllCargoPackages(resolvedPackingListId);
          packageResults.forEach((pkg) => {
            if (pkg.id) {
              packageMap[pkg.id] = pkg;
              lineNoMap[pkg.id] = parseLineNo(pkg.lineNo);
            }
          });
        }

        const mappedQueue: CargoPackageCheckItem[] = queuePackages.map((pkg) => {
          const record = packageMap[pkg.id];
          return {
            id: pkg.id,
            packageNo: pkg.packageNo ?? record?.packageNo ?? null,
            packingListId: resolvedPackingListId,
            hblNumber: null,
            lineId: record?.lineId ?? pkg.id,
            lineNo: lineNoMap[pkg.id] ?? null,
            cargoDescription:
              record?.cargoDescription ??
              (pkg.packageNo ? `Cargo package ${pkg.packageNo}` : 'Cargo package'),
            cargoType: null,
            cargoUnit: null,
            packageType: record?.packageType ?? '—',
            cargoStatus:
              (record?.conditionStatus as CargoStatus | null | undefined) ?? null,
            customsStatus:
              (record?.regulatoryStatus as CustomsStatus | null | undefined) ??
              null,
            isChecked: false,
            checkedDate: null,
          };
        });

        const mappedCompleted: CargoPackageCheckItem[] = completedPackages.map((pkg) => {
          const record = packageMap[pkg.id];
          return {
            id: pkg.id,
            packageNo: pkg.packageNo ?? record?.packageNo ?? null,
            packingListId: resolvedPackingListId,
            hblNumber: null,
            lineId: record?.lineId ?? pkg.id,
            lineNo: lineNoMap[pkg.id] ?? null,
            cargoDescription:
              record?.cargoDescription ??
              (pkg.packageNo ? `Cargo package ${pkg.packageNo}` : 'Cargo package'),
            cargoType: null,
            cargoUnit: null,
            packageType: record?.packageType ?? '—',
            cargoStatus:
              (record?.conditionStatus as CargoStatus | null | undefined) ?? null,
            customsStatus:
              (record?.regulatoryStatus as CustomsStatus | null | undefined) ??
              null,
            isChecked: true,
            checkedDate: transaction.updatedAt,
          };
        });

        const queueIds = new Set(mappedQueue.map((pkg) => pkg.id));
        const merged = [...mappedQueue, ...mappedCompleted.filter((pkg) => !queueIds.has(pkg.id))];

        setFlow({
          title: 'Cargo package handover',
          hblNumber: '',
          workingStatus: 'in-progress',
        });
        setPackages(merged);
      } else {
        const data = await fetchMockCargoPackageData();
        setFlow(data.flow);
        setPackages(data.packages);
      }
    } catch (err) {
      console.error('Failed to load cargo packages', err);
      setError('Failed to load cargo packages.');
      toast.error('Failed to load cargo packages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    fetchAllCargoPackages,
    handoverCompletedStatus,
    handoverQueueStatus,
    packageTransactionId,
    packingListId,
    parseLineNo,
    toast,
  ]);

  React.useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const uncheckedPackages = React.useMemo(
    () => packages.filter(pkg => !pkg.isChecked),
    [packages],
  );

  const checkedPackages = React.useMemo(
    () => packages.filter(pkg => pkg.isChecked),
    [packages],
  );

  React.useEffect(() => {
    if (uncheckedPackages.length === 0) {
      setSelectedQueueIds(new Set());
      return;
    }

    const queueIds = new Set(uncheckedPackages.map((pkg) => pkg.id));
    setSelectedQueueIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => queueIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [uncheckedPackages]);

  const checkedGroups = React.useMemo(
    () => groupCheckedByLine(checkedPackages),
    [checkedPackages],
  );

  const selectedQueueCount = React.useMemo(
    () =>
      uncheckedPackages.reduce(
        (count, pkg) => (selectedQueueIds.has(pkg.id) ? count + 1 : count),
        0,
      ),
    [selectedQueueIds, uncheckedPackages],
  );
  const allQueueSelected = uncheckedPackages.length > 0 && selectedQueueCount === uncheckedPackages.length;
  const partiallySelectedQueue = selectedQueueCount > 0 && !allQueueSelected;

  const totalChecked = checkedPackages.length;
  const primaryPackingListId = packages[0]?.packingListId ?? '—';

  const handleSave = async (pkgId: string) => {
    if (packageTransactionId) {
      try {
        await packageTransactionsApi.handleStep(packageTransactionId, {
          step: 'handover',
          packageIds: [pkgId],
        });
        toast.success('Package handed over.');
        setSelectedQueueIds((prev) => {
          if (!prev.has(pkgId)) return prev;
          const next = new Set(prev);
          next.delete(pkgId);
          return next;
        });
        await loadPackages(true);
        void Promise.resolve(onTransactionUpdated?.()).catch(() => {});
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to handover package';
        toast.error(message);
      }
      return;
    }

    setPackages(prev =>
      prev.map(pkg =>
        pkg.id === pkgId
          ? {
            ...pkg,
            isChecked: true,
            checkedDate: new Date().toISOString(),
          }
          : pkg,
      ),
    );
    setSelectedQueueIds((prev) => {
      if (!prev.has(pkgId)) return prev;
      const next = new Set(prev);
      next.delete(pkgId);
      return next;
    });
    toast.success('Package handed over.');
  };

  const handleToggleQueuePackage = React.useCallback(
    (pkgId: string, checked: boolean) => {
      setSelectedQueueIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(pkgId);
        } else {
          next.delete(pkgId);
        }
        return next;
      });
    },
    [],
  );

  const handleToggleAllQueue = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedQueueIds(new Set(uncheckedPackages.map((pkg) => pkg.id)));
        return;
      }
      setSelectedQueueIds(new Set());
    },
    [uncheckedPackages],
  );

  const bulkHandoverMutation = useMutation({
    mutationFn: async (packageIds: string[]) => {
      if (!packageIds.length) return;

      if (packageTransactionId) {
        await packageTransactionsApi.handleStep(packageTransactionId, {
          step: 'handover',
          packageIds,
        });
        return;
      }

      setPackages((prev) =>
        prev.map((pkg) =>
          packageIds.includes(pkg.id)
            ? {
              ...pkg,
              isChecked: true,
              checkedDate: new Date().toISOString(),
            }
            : pkg,
        ),
      );
    },
    onSuccess: async (_, packageIds) => {
      if (!packageIds.length) return;
      toast.success(`Handed over ${packageIds.length} package(s).`);
      setSelectedQueueIds(new Set());
      if (packageTransactionId) {
        await loadPackages(true);
        void Promise.resolve(onTransactionUpdated?.()).catch(() => {});
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to handover packages';
      toast.error(message);
    },
  });

  const selectAllCheckboxRef = React.useRef<HTMLInputElement | null>(null);
  const isQueueExpanded = enableQueueCollapse ? queueExpanded : true;

  React.useEffect(() => {
    if (!selectAllCheckboxRef.current) return;
    selectAllCheckboxRef.current.indeterminate = partiallySelectedQueue;
  }, [partiallySelectedQueue]);

  React.useEffect(() => {
    if (!enableQueueCollapse) {
      setQueueExpanded(true);
      return;
    }

    if (activeTab === 'queue') {
      setQueueExpanded(false);
    }
  }, [activeTab, enableQueueCollapse]);

  React.useEffect(() => {
    if (!showCompletedLog && activeTab === 'completed') {
      setActiveTab('queue');
    }
  }, [activeTab, showCompletedLog]);

  const handleToggleQueueExpanded = React.useCallback(() => {
    if (!enableQueueCollapse) return;
    setQueueExpanded((prev) => !prev);
  }, [enableQueueCollapse]);

  const handleQueueControlsKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enableQueueCollapse) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setQueueExpanded((prev) => !prev);
      }
    },
    [enableQueueCollapse],
  );

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const content = (
    <div className="space-y-8">
      <CargoPackageCheckHeader
        flow={flow}
        primaryPackingListId={primaryPackingListId}
        packingListLabel={packingListLabel}
        headerHbl={headerHbl}
        totalChecked={totalChecked}
        onRefresh={() => loadPackages(true)}
        refreshing={refreshing}
        error={error}
        showMetaRow={false}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {showCheckTabs ? (
          <div className="mb-6 inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                activeTab === 'queue'
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>HANDOVER QUEUE</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${
                  activeTab === 'queue'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700'
                }`}
              >
                {uncheckedPackages.length}
              </span>
            </button>
            {showCompletedLog ? (
              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                  activeTab === 'completed'
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span>COMPLETED LOG</span>
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${
                    activeTab === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700'
                  }`}
                >
                  {totalChecked}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'queue' || !showCompletedLog ? (
          <div className="flex flex-col gap-4">
            <div
              role={enableQueueCollapse ? 'button' : undefined}
              tabIndex={enableQueueCollapse ? 0 : undefined}
              aria-expanded={enableQueueCollapse ? isQueueExpanded : undefined}
              aria-controls={enableQueueCollapse ? 'handover-queue-list' : undefined}
              onClick={enableQueueCollapse ? handleToggleQueueExpanded : undefined}
              onKeyDown={enableQueueCollapse ? handleQueueControlsKeyDown : undefined}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition dark:border-slate-800 dark:bg-slate-900/50 ${
                enableQueueCollapse
                  ? 'hover:border-slate-300 dark:hover:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                  : ''
              }`}
            >
              <div
                className="flex items-center gap-2"
                onClick={
                  enableQueueCollapse ? (event) => event.stopPropagation() : undefined
                }
              >
                <input
                  ref={selectAllCheckboxRef}
                  id="handover-select-all-queue"
                  type="checkbox"
                  checked={allQueueSelected}
                  disabled={readOnly || uncheckedPackages.length === 0}
                  onChange={(event) => handleToggleAllQueue(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:checked:bg-blue-500"
                />
                <label
                  htmlFor="handover-select-all-queue"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Check all queue packages
                </label>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  {uncheckedPackages.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    bulkHandoverMutation.mutate(Array.from(selectedQueueIds));
                  }}
                  disabled={
                    readOnly ||
                    selectedQueueCount === 0 ||
                    bulkHandoverMutation.isPending
                  }
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  {bulkHandoverMutation.isPending
                    ? 'Processing...'
                    : `Handover selected (${selectedQueueCount})`}
                </button>
                {enableQueueCollapse ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isQueueExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                ) : null}
              </div>
            </div>

            {showQueuePackageList && isQueueExpanded ? (
              <div id="handover-queue-list">
                <InspectionQueue
                  packages={uncheckedPackages}
                  selectedPackageIds={selectedQueueIds}
                  onTogglePackage={handleToggleQueuePackage}
                  readOnly={readOnly}
                  onSave={(id) => void handleSave(id)}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <div>
                <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">COMPLETED LOG</h3>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Verified items — {totalChecked}</p>
              </div>
              <InfoChip label="Total" value={String(totalChecked)} tone="green" />
            </div>

            <CompletedTable groups={checkedGroups} />
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 p-4 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-6 lg:p-8">
      {/* Precision Functional Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .bg-grid-pattern {
          background-image: radial-gradient(#94a3b8 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.15;
        }
        .dark .bg-grid-pattern {
          background-image: radial-gradient(#475569 1px, transparent 1px);
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-grid-pattern" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl">{content}</div>
    </div>
  );
};

export default CargoPackageCheck;
