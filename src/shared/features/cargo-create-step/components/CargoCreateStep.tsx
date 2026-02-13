import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';

import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { Button } from '@/shared/components/ui/Button';
import { useToast } from '@/shared/hooks';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';

import { useCargoCreateStepData } from '../hooks';
import type { CargoCreateStepProps } from '../types';
import { CargoCreateStepHeader } from './CargoCreateStepHeader';

const toNumber = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const CargoCreateStep: React.FC<CargoCreateStepProps> = ({
  packingListId,
  packageTransactionId,
  orderNumber,
  readOnly = false,
  onTransactionUpdated,
}) => {
  const toast = useToast();
  const [pendingLineId, setPendingLineId] = React.useState<string | null>(null);
  const [lineInputs, setLineInputs] = React.useState<Record<string, string>>({});
  const [optimisticCounts, setOptimisticCounts] = React.useState<Record<string, number>>({});

  const {
    packingListQuery,
    linesQuery,
    transactionQuery,
    cargoPackagesQuery,
    forwarderQuery,
  } = useCargoCreateStepData(packingListId, packageTransactionId);

  const packingList = packingListQuery.data;
  const lines = React.useMemo(
    () => linesQuery.data ?? [],
    [linesQuery.data],
  );
  const transaction = transactionQuery.data;
  const cargoPackages = React.useMemo(
    () => cargoPackagesQuery.data ?? [],
    [cargoPackagesQuery.data],
  );
  const forwarder = forwarderQuery.data;

  const isLoading =
    packingListQuery.isLoading ||
    linesQuery.isLoading ||
    transactionQuery.isLoading ||
    cargoPackagesQuery.isLoading;
  const errorMessage =
    (packingListQuery.error as Error | undefined)?.message ||
    (linesQuery.error as Error | undefined)?.message ||
    (transactionQuery.error as Error | undefined)?.message ||
    (cargoPackagesQuery.error as Error | undefined)?.message ||
    null;

  React.useEffect(() => {
    setOptimisticCounts({});
    setLineInputs({});
  }, [packingListId, packageTransactionId]);

  React.useEffect(() => {
    if (lines.length === 0) return;
    setLineInputs((prev) => {
      const next = { ...prev };
      lines.forEach((line) => {
        if (!next[line.id]) {
          next[line.id] = '1';
        }
      });
      return next;
    });
  }, [lines]);

  const transactionPackageIds = React.useMemo(() => {
    return new Set(transaction?.packages?.map((pkg) => pkg.id) ?? []);
  }, [transaction?.packages]);

  const baseCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (transactionPackageIds.size === 0) return counts;

    cargoPackages.forEach((pkg) => {
      if (!transactionPackageIds.has(pkg.id)) return;
      const lineId = pkg.lineId ?? '';
      if (!lineId) return;
      counts[lineId] = (counts[lineId] ?? 0) + 1;
    });

    return counts;
  }, [cargoPackages, transactionPackageIds]);

  const getLineReceivedCount = React.useCallback(
    (lineId: string) => {
      return (baseCounts[lineId] ?? 0) + (optimisticCounts[lineId] ?? 0);
    },
    [baseCounts, optimisticCounts],
  );

  const totalPackages = React.useMemo(
    () => lines.reduce((sum, line) => sum + (line.numberOfPackages ?? 0), 0),
    [lines],
  );

  const totalReceived = React.useMemo(
    () => lines.reduce((sum, line) => sum + getLineReceivedCount(line.id), 0),
    [getLineReceivedCount, lines],
  );

  const handleInputChange = (lineId: string, value: string) => {
    if (value === '' || /^[0-9]+$/.test(value)) {
      setLineInputs((prev) => ({ ...prev, [lineId]: value }));
    }
  };

  const handleReceive = async (lineId: string) => {
    if (readOnly) return;
    const rawValue = lineInputs[lineId] ?? '1';
    const count = toNumber(rawValue);

    if (!count || count < 1) {
      toast.error('Enter a valid received package count (minimum 1).');
      return;
    }

    setPendingLineId(lineId);
    let successCount = 0;

    for (let i = 0; i < count; i += 1) {
      try {
        await packageTransactionsApi.handleStep(packageTransactionId, {
          step: 'create',
          lineId,
          packageCount: 1,
        });
        successCount += 1;
        setOptimisticCounts((prev) => ({
          ...prev,
          [lineId]: (prev[lineId] ?? 0) + 1,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to receive package';
        toast.error(message);
        break;
      }
    }

    if (successCount > 0) {
      toast.success(`Received ${successCount} package${successCount === 1 ? '' : 's'}.`);
      void Promise.resolve(onTransactionUpdated?.()).catch(() => {});
    }

    setPendingLineId(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-800 shadow-sm dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div className="font-semibold">Unable to load cargo create step data</div>
          <div className="mt-1 text-sm">{errorMessage}</div>
        </div>
      </div>
    );
  }

  if (!packingList || !transaction) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
        Select a transaction to start receiving cargo packages.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CargoCreateStepHeader
        packingListNumber={packingList.packingListNumber}
        hblNumber={packingList.hblData?.hblCode ?? null}
        containerNumber={packingList.hblData?.containerNumber ?? null}
        directionFlow={packingList.directionFlow ?? null}
        orderNumber={orderNumber ?? null}
        forwarderName={forwarder?.name ?? packingList.hblData?.forwarderName ?? null}
        forwarderCode={forwarder?.code ?? null}
        totalPackages={totalPackages}
        totalReceived={totalReceived}
      />

      <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
          Packing List Lines
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <span className="col-span-1">Line</span>
              <span className="col-span-3">Cargo Description</span>
              <span className="col-span-1">Unit</span>
              <span className="col-span-2">Pkg Type</span>
              <span className="col-span-1 text-right">PL Pkgs</span>
              <span className="col-span-1 text-right">Received</span>
              <span className="col-span-2 text-center">Receive Qty</span>
              <span className="col-span-1 text-right">Action</span>
            </div>

            {lines.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No packing list lines available.
              </div>
            ) : (
              lines.map((line, index) => {
                const receivedCount = getLineReceivedCount(line.id);
                const inputValue = lineInputs[line.id] ?? '1';
                const isPending = pendingLineId === line.id;

                return (
                  <div
                    key={line.id}
                    className="grid grid-cols-12 items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-b-0 dark:border-slate-800 dark:text-slate-200"
                  >
                    <span className="col-span-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{index + 1}</span>
                    <span className="col-span-3 font-medium text-slate-900 dark:text-slate-100">
                      {line.commodityDescription}
                    </span>
                    <span className="col-span-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {line.unitOfMeasure}
                    </span>
                    <span className="col-span-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {line.packageTypeCode}
                    </span>
                    <span className="col-span-1 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {line.numberOfPackages}
                    </span>
                    <span className="col-span-1 text-right font-semibold text-blue-600 dark:text-blue-300">
                      {receivedCount}
                    </span>
                    <div className="col-span-2 flex items-center justify-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={inputValue}
                        onChange={(event) => handleInputChange(line.id, event.target.value)}
                        disabled={isPending || readOnly}
                        className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={isPending}
                        disabled={isPending || readOnly}
                        onClick={() => void handleReceive(line.id)}
                        className="px-3"
                      >
                        <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Receive
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CargoCreateStep;
