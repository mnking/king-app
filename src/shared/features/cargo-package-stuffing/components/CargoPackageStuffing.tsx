import React from 'react';

import { LoadingSpinner } from '@/shared/components/ui';
import { useToast } from '@/shared/hooks';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import { cargoPackagesApi } from '@/services/apiCargoPackages';

import { groupStuffedByLine } from '../helpers/groupStuffedByLine';
import type {
  CargoPackageStuffingItem,
  CargoPackageSummary,
  CargoStatus,
  CustomsStatus,
} from '../types';
import { StuffingHeader } from './internal/StuffingHeader';
import { StuffingQueue } from './internal/StuffingQueue';
import { StuffedTable } from './internal/StuffedTable';

export interface CargoPackageStuffingProps {
  embedded?: boolean;
  packingListId?: string | null;
  packingListLabel?: string | null;
  packageTransactionId?: string | null;
  stuffingQueueStatus?: string | null;
  stuffingCompletedStatus?: string | null;
  readOnly?: boolean;
  onTransactionUpdated?: () => void | Promise<void>;
}

export const CargoPackageStuffing: React.FC<CargoPackageStuffingProps> = ({
  embedded = false,
  packingListId = null,
  packingListLabel = null,
  packageTransactionId = null,
  stuffingQueueStatus = null,
  stuffingCompletedStatus = null,
  readOnly = false,
  onTransactionUpdated,
}) => {
  const toast = useToast();
  const [packages, setPackages] = React.useState<CargoPackageStuffingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
    const results: CargoPackageSummary[] = [];

    for (let page = 1; page <= 50; page += 1) {
      const pageResults = (await cargoPackagesApi.getAll(
        id,
        page,
        itemsPerPage,
      )) as CargoPackageSummary[];
      results.push(...pageResults);
      if (pageResults.length < itemsPerPage) break;
    }

    return results;
  }, []);

  const loadPackages = React.useCallback(async (isRefresh = false) => {
    if (!packageTransactionId) return;

    setError(null);
    setRefreshing(isRefresh);
    setLoading((prev) => (isRefresh ? prev : true));

    try {
      const transactionResponse = await packageTransactionsApi.getById(packageTransactionId);
      const transaction = transactionResponse.data;

      const queueStatus = stuffingQueueStatus ?? 'CHECK_IN';
      const completedStatuses = new Set<string>(['IN_CONTAINER']);
      if (stuffingCompletedStatus) completedStatuses.add(stuffingCompletedStatus);

      const transactionPackages = Array.isArray(transaction.packages) ? transaction.packages : [];
      const queuePackages = transactionPackages.filter(
        (pkg) => String(pkg.positionStatus ?? '') === queueStatus,
      );
      const completedPackages = transactionPackages.filter(
        (pkg) => completedStatuses.has(String(pkg.positionStatus ?? '')),
      );

      const resolvedPackingListId = packingListId ?? transaction.packingListId ?? '';
      const packageMap: Record<string, CargoPackageSummary> = {};
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

      const mapRecord = (pkg: { id: string; packageNo?: string | null }) => {
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
          cargoStatus: (record?.conditionStatus as CargoStatus | null | undefined) ?? null,
          customsStatus: (record?.regulatoryStatus as CustomsStatus | null | undefined) ?? null,
          isChecked: false,
          checkedDate: null,
        } as CargoPackageStuffingItem;
      };

      const mappedQueue = queuePackages.map((pkg) => ({
        ...mapRecord(pkg),
        isChecked: false,
        checkedDate: null,
      }));
      const mappedCompleted = completedPackages.map((pkg) => ({
        ...mapRecord(pkg),
        isChecked: true,
        checkedDate: transaction.updatedAt,
      }));

      const queueIds = new Set(mappedQueue.map((pkg) => pkg.id));
      const merged = [
        ...mappedQueue,
        ...mappedCompleted.filter((pkg) => !queueIds.has(pkg.id)),
      ];
      setPackages(merged);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cargo packages.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    fetchAllCargoPackages,
    packageTransactionId,
    packingListId,
    parseLineNo,
    stuffingQueueStatus,
    stuffingCompletedStatus,
    toast,
  ]);

  React.useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const uncheckedPackages = React.useMemo(
    () => packages.filter((pkg) => !pkg.isChecked),
    [packages],
  );

  const checkedPackages = React.useMemo(
    () => packages.filter((pkg) => pkg.isChecked),
    [packages],
  );

  const checkedGroups = React.useMemo(
    () => groupStuffedByLine(checkedPackages),
    [checkedPackages],
  );

  const handleSave = async (pkgId: string) => {
    if (!packageTransactionId) return;

    try {
      await packageTransactionsApi.handleStep(packageTransactionId, {
        step: 'stuffing',
        packageIds: [pkgId],
      });
      toast.success('Package stuffed.');
      await loadPackages(true);
      void Promise.resolve(onTransactionUpdated?.()).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stuff package';
      toast.error(message);
    }
  };

  if (!packageTransactionId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Package transaction is required to load stuffing data.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'}>
      <StuffingHeader
        packingListLabel={packingListLabel}
        totalStuffed={checkedPackages.length}
        onRefresh={() => loadPackages(true)}
        refreshing={refreshing}
        error={error}
      />
      <div className="mt-4 space-y-6">
        <StuffingQueue packages={uncheckedPackages} readOnly={readOnly} onSave={handleSave} />
        <StuffedTable groups={checkedGroups} />
      </div>
    </div>
  );
};

export default CargoPackageStuffing;
