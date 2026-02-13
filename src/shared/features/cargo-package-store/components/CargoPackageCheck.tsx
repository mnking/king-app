import React from 'react';
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
import { PrintPreviewModal, type PackingListPreview } from './PrintPreviewModal';
import { StoreLocationsModal, type SelectedLocation } from './StoreLocationsModal';

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

export interface CargoPackageStoreProps {
  embedded?: boolean;
  packingListId?: string | null;
  packingListLabel?: string | null;
  packingListPreview?: PackingListPreview | null;
  packageTransactionId?: string | null;
  storeQueueStatus?: PositionStatus | null;
  storeCompletedStatus?: PositionStatus | null;
  readOnly?: boolean;
  onTransactionUpdated?: () => void | Promise<void>;
}

export const CargoPackageStore: React.FC<CargoPackageStoreProps> = ({
  embedded = false,
  packingListId = null,
  packingListLabel = null,
  packingListPreview = null,
  packageTransactionId = null,
  storeQueueStatus = null,
  storeCompletedStatus = null,
  readOnly = false,
  onTransactionUpdated,
}) => {
  const toast = useToast();
  const [flow, setFlow] = React.useState<CargoPackageCheckFlow | null>(null);
  const [packages, setPackages] = React.useState<CargoPackageCheckItem[]>([]);
  const [packageRecords, setPackageRecords] = React.useState<Record<string, CargoPackageRecord>>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [renderDate] = React.useState(() => new Date());
  const [activeTab, setActiveTab] = React.useState<'queue' | 'completed'>('queue');
  const [generatingId, setGeneratingId] = React.useState<string | null>(null);
  const [printPreview, setPrintPreview] = React.useState<CargoPackageRecord | null>(null);
  const [storeModalPackage, setStoreModalPackage] = React.useState<CargoPackageRecord | null>(null);
  const [storeSubmitting, setStoreSubmitting] = React.useState(false);

  const headerHbl = React.useMemo(() => packages.find(pkg => pkg.hblNumber)?.hblNumber ?? flow?.hblNumber ?? null, [flow?.hblNumber, packages]);
  const resolvedPackingListPreview = React.useMemo(() => {
    if (packingListPreview) return packingListPreview;
    if (!packingListId) return null;
    return {
      id: packingListId,
      packingListNumber: packingListLabel ?? packingListId,
      hblData: null,
    };
  }, [packingListId, packingListLabel, packingListPreview]);

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
        const queueStatus = storeQueueStatus ?? 'CHECK_IN';
        const completedStatus = storeCompletedStatus ?? 'STORED';

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
        setPackageRecords(packageMap);

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
          title: 'Cargo package store',
          hblNumber: '',
          workingStatus: 'in-progress',
        });
        setPackages(merged);
      } else {
        const data = await fetchMockCargoPackageData();
        setFlow(data.flow);
        setPackages(data.packages);
        setPackageRecords({});
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
    packageTransactionId,
    packingListId,
    parseLineNo,
    storeCompletedStatus,
    storeQueueStatus,
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

  const checkedGroups = React.useMemo(
    () => groupCheckedByLine(checkedPackages),
    [checkedPackages],
  );

  const packageMetaById = React.useMemo(() => {
    const meta: Record<string, { code: string | null; hasCode: boolean }> = {};
    packages.forEach((pkg) => {
      const record = packageRecords[pkg.id];
      const code = record?.packageNo ?? pkg.packageNo ?? null;
      meta[pkg.id] = { code, hasCode: Boolean(code) };
    });
    return meta;
  }, [packageRecords, packages]);

  const totalChecked = checkedPackages.length;
  const primaryPackingListId = packages[0]?.packingListId ?? '—';

  const getPackageRecord = React.useCallback(
    (pkgId: string): CargoPackageRecord | null => {
      const record = packageRecords[pkgId];
      if (record) return record;

      const fallback = packages.find((pkg) => pkg.id === pkgId);
      if (!fallback) return null;

      return {
        id: fallback.id,
        packingListId: fallback.packingListId,
        packageNo: fallback.packageNo ?? null,
        lineId: fallback.lineId ?? null,
        lineNo: fallback.lineNo ?? undefined,
        cargoDescription: fallback.cargoDescription ?? null,
        packageType: fallback.packageType ?? null,
        conditionStatus: (fallback.cargoStatus as CargoPackageRecord['conditionStatus']) ?? null,
        regulatoryStatus: (fallback.customsStatus as CargoPackageRecord['regulatoryStatus']) ?? null,
      };
    },
    [packageRecords, packages],
  );

  const handleGenerateCode = async (pkgId: string) => {
    if (readOnly) return;
    if (!packageTransactionId) {
      setPackages(prev =>
        prev.map(pkg =>
          pkg.id === pkgId && !pkg.packageNo
            ? { ...pkg, packageNo: `CODE-${pkg.id.slice(0, 6).toUpperCase()}` }
            : pkg,
        ),
      );
      toast.success('Package code generated.');
      return;
    }

    setGeneratingId(pkgId);
    try {
      await cargoPackagesApi.generateCode(pkgId);
      toast.success('Package code generated.');
      await loadPackages(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate code';
      toast.error(message);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleOpenPrint = (pkgId: string) => {
    const record = getPackageRecord(pkgId);
    if (!record) return;
    setPrintPreview(record);
  };

  const handleOpenStore = (pkgId: string) => {
    if (readOnly) return;
    const record = getPackageRecord(pkgId);
    if (!record) return;
    setStoreModalPackage(record);
  };

  const handleStoreLocations = async (locations: SelectedLocation[]) => {
    if (!storeModalPackage) return;

    if (!packageTransactionId) {
      setPackages(prev =>
        prev.map(pkg =>
          pkg.id === storeModalPackage.id
            ? {
              ...pkg,
              isChecked: true,
              checkedDate: new Date().toISOString(),
            }
            : pkg,
        ),
      );
      toast.success('Package stored.');
      setStoreModalPackage(null);
      return;
    }

    setStoreSubmitting(true);
    try {
      await packageTransactionsApi.handleStep(packageTransactionId, {
        step: 'store',
        packageIds: [storeModalPackage.id],
        toLocationId: locations.map((loc) => loc.id),
      });
      toast.success('Package stored.');
      await loadPackages(true);
      void Promise.resolve(onTransactionUpdated?.()).catch(() => {});
      setStoreModalPackage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to store package';
      toast.error(message);
    } finally {
      setStoreSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const modals = (
    <>
      <PrintPreviewModal
        open={Boolean(printPreview)}
        onClose={() => setPrintPreview(null)}
        packingListDetail={resolvedPackingListPreview}
        packageRecord={printPreview}
      />
      <StoreLocationsModal
        open={Boolean(storeModalPackage)}
        packageRecord={storeModalPackage}
        isSubmitting={storeSubmitting}
        onClose={() => setStoreModalPackage(null)}
        onSubmit={handleStoreLocations}
      />
    </>
  );

  const content = (
    <div className="space-y-8">
      <CargoPackageCheckHeader
        flow={flow}
        renderDate={renderDate}
        primaryPackingListId={primaryPackingListId}
        packingListLabel={packingListLabel}
        headerHbl={headerHbl}
        totalChecked={totalChecked}
        onRefresh={() => loadPackages(true)}
        refreshing={refreshing}
        error={error}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'queue'
              ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>STORE QUEUE</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${activeTab === 'queue'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-700'
            }`}>
              {uncheckedPackages.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'completed'
              ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>COMPLETED LOG</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${activeTab === 'completed'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-700'
            }`}>
              {totalChecked}
            </span>
          </button>
        </div>

        {activeTab === 'queue' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <div>
                <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">STORE QUEUE</h3>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Pending actions — {uncheckedPackages.length}</p>
              </div>
              <InfoChip label="Queue" value={String(uncheckedPackages.length)} tone="amber" />
            </div>

            <InspectionQueue
              packages={uncheckedPackages}
              packageMetaById={packageMetaById}
              generatingId={generatingId}
              readOnly={readOnly}
              onGenerateCode={(id) => void handleGenerateCode(id)}
              onPrintLabel={handleOpenPrint}
              onStore={handleOpenStore}
            />
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
    return (
      <>
        {content}
        {modals}
      </>
    );
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
      {modals}
    </div>
  );
};

export default CargoPackageStore;
