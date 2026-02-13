import React from 'react';
import { AlertTriangle, Check, RefreshCw, Trash2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/hooks';
import type { PositionStatus } from '@/features/cargo-package-storage/types';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import type { PackageTransaction } from '@/features/cfs-cargo-package-delivery/types/package-transaction-types';
import { CargoCreateStep } from '@/shared/features/cargo-create-step';
import { CargoPackageCheck } from '@/shared/features/cargo-package-check';
import { CargoPackageStore } from '@/shared/features/cargo-package-store';

import type { ExportCargoReceivingListItem } from '../types';
import {
  exportCargoReceivingQueryKeys,
  useExportCargoReceivingFlowConfig,
  useExportCargoReceivingPackageTransaction,
  useExportCargoReceivingPackageTransactions,
} from '../hooks';

interface ExportCargoReceivingTransactionModalProps {
  open: boolean;
  item: ExportCargoReceivingListItem;
  onClose: () => void;
}

const FLOW_NAME = 'destuffWarehouse';

const stepLabel = (code: string) => {
  switch (code) {
    case 'create':
      return 'Create';
    case 'inspect':
      return 'Inspect';
    case 'store':
      return 'Store';
    default:
      return code;
  }
};

const StepNotImplemented: React.FC<{ code: string }> = ({ code }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100">
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
    <div className="space-y-1">
      <p className="text-sm font-semibold">Step not implemented</p>
      <p className="text-sm">
        This flow step is not supported yet: <span className="font-mono">{code}</span>
      </p>
    </div>
  </div>
);

export const ExportCargoReceivingTransactionModal: React.FC<
  ExportCargoReceivingTransactionModalProps
> = ({ open, item, onClose }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeStepIndex, setActiveStepIndex] = React.useState(0);
  const [createdTransaction, setCreatedTransaction] =
    React.useState<PackageTransaction | null>(null);

  const packingListId = item.id;
  const packingListPreview = React.useMemo(
    () => ({
      id: packingListId,
      packingListNumber: item.packingListNumber ?? null,
      hblData: {
        forwarderName: item.forwarderName ?? item.hblData?.forwarderName ?? null,
        containerNumber: item.hblData?.containerNumber ?? null,
        containerType: item.hblData?.containerType ?? null,
        hblCode: null,
        sealNumber: null,
      },
    }),
    [
      packingListId,
      item.forwarderName,
      item.hblData?.containerNumber,
      item.hblData?.containerType,
      item.hblData?.forwarderName,
      item.packingListNumber,
    ],
  );

  const {
    data: transactionsResponse,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
    error: transactionsError,
  } = useExportCargoReceivingPackageTransactions(packingListId);

  const transactions = React.useMemo(
    () => transactionsResponse?.results ?? [],
    [transactionsResponse],
  );
  const latestTransaction = React.useMemo(
    () => transactions[0] ?? null,
    [transactions],
  );
  const latestDoneTransaction = React.useMemo(
    () => (latestTransaction?.status === 'DONE' ? latestTransaction : null),
    [latestTransaction],
  );

  const inProgressTransaction = React.useMemo(
    () =>
      transactions.find((transaction) => transaction.status === 'IN_PROGRESS') ??
      null,
    [transactions],
  );

  const flowQuery = useExportCargoReceivingFlowConfig(FLOW_NAME, {
    enabled: open,
  });

  const createTransaction = useMutation({
    mutationFn: async () => {
      const response = await packageTransactionsApi.create({
        packingListId,
        businessProcessFlow: FLOW_NAME,
      });
      return response.data;
    },
    onSuccess: (created) => {
      setCreatedTransaction(created);
      toast.success('Transaction created');
      queryClient.invalidateQueries({
        queryKey: exportCargoReceivingQueryKeys.packageTransactions(packingListId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create transaction');
    },
  });

  React.useEffect(() => {
    if (!open) {
      setActiveStepIndex(0);
      setCreatedTransaction(null);
      return;
    }
    if (inProgressTransaction) {
      setCreatedTransaction(null);
    }
  }, [inProgressTransaction, open]);

  const activeTransaction =
    inProgressTransaction ??
    createdTransaction ??
    latestDoneTransaction;
  const activeTransactionId = activeTransaction?.id ?? '';

  const transactionDetailQuery = useExportCargoReceivingPackageTransaction(
    activeTransactionId,
    {
      enabled: open && Boolean(activeTransactionId),
    },
  );

  const steps = React.useMemo(
    () => flowQuery.data?.steps ?? [],
    [flowQuery.data?.steps],
  );

  React.useEffect(() => {
    setActiveStepIndex(0);
  }, [activeTransactionId, steps.length]);

  const activeStep = steps[activeStepIndex] ?? null;
  const activeStepCode = activeStep?.code ? String(activeStep.code) : '';

  const transactionDetail = transactionDetailQuery.data ?? null;
  const transactionStatus =
    transactionDetail?.status ?? activeTransaction?.status ?? null;
  const transactionPackages =
    transactionDetail?.packages ?? activeTransaction?.packages ?? [];

  const statusByStep = React.useMemo(() => {
    const map = new Map<string, string>();
    steps.forEach((step) => {
      if (!step?.code || !step?.toStatus) return;
      map.set(String(step.code), String(step.toStatus));
    });
    return map;
  }, [steps]);

  const createdCount = statusByStep.has('create')
    ? transactionPackages.filter(
      (pkg) => pkg.positionStatus === statusByStep.get('create'),
    ).length
    : 0;
  const inspectedCount = statusByStep.has('inspect')
    ? transactionPackages.filter(
      (pkg) => pkg.positionStatus === statusByStep.get('inspect'),
    ).length
    : 0;
  const storedCount = transactionPackages.filter(
    (pkg) => pkg.positionStatus === 'STORED',
  ).length;

  const totalPackages = transactionPackages.length;
  const canComplete =
    totalPackages > 0 &&
    (statusByStep.has('store') ? storedCount === totalPackages : false);
  const canDelete = totalPackages === 0 && transactionStatus !== 'DONE';
  const readOnly = transactionStatus === 'DONE';
  const hasActiveInProgress = transactionStatus === 'IN_PROGRESS';
  const canCreateNewTransaction = !hasActiveInProgress;
  const handleCreateNewTransaction = React.useCallback(() => {
    if (!packingListId) return;
    if (!canCreateNewTransaction) return;
    if (createTransaction.isPending) return;
    createTransaction.mutate();
  }, [canCreateNewTransaction, createTransaction, packingListId]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await packageTransactionsApi.complete(activeTransactionId);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Transaction completed.');
      void transactionDetailQuery.refetch();
      queryClient.invalidateQueries({
        queryKey: exportCargoReceivingQueryKeys.packageTransactions(packingListId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete transaction');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await packageTransactionsApi.delete(activeTransactionId);
    },
    onSuccess: () => {
      toast.success('Transaction deleted.');
      queryClient.invalidateQueries({
        queryKey: exportCargoReceivingQueryKeys.packageTransactions(packingListId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete transaction');
    },
  });

  const showComplete =
    canComplete &&
    transactionStatus !== 'DONE' &&
    !completeMutation.isPending &&
    !deleteMutation.isPending;
  const showDelete =
    canDelete && !deleteMutation.isPending && !completeMutation.isPending;

  const handleTransactionUpdated = React.useCallback(() => {
    void transactionDetailQuery.refetch();
    queryClient.invalidateQueries({
      queryKey: exportCargoReceivingQueryKeys.packageTransactions(packingListId),
    });
  }, [packingListId, queryClient, transactionDetailQuery]);

  if (!open) return null;

  const isLoading =
    isTransactionsLoading ||
    flowQuery.isLoading ||
    transactionDetailQuery.isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Export cargo receiving
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {item.packingListNumber ?? item.id}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Forwarder: {item.forwarderName ?? item.hblData?.forwarderName ?? '—'}
              {' • '}Container: {item.hblData?.containerNumber ?? '—'}
              {' • '}Order: {item.serviceOrderNumber ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="gap-2"
            >
              <X className="h-4 w-4" />

            </Button> */}
            <button
              type="button"
              onClick={onClose}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {isTransactionsError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-100">
              <p className="text-sm font-semibold">Unable to load transactions</p>
              <p className="mt-1 text-sm">
                {(transactionsError as Error | undefined)?.message ??
                  'Failed to load package transactions'}
              </p>
            </div>
          ) : transactionDetailQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-100">
              <p className="text-sm font-semibold">Unable to load transaction</p>
              <p className="mt-1 text-sm">
                {(transactionDetailQuery.error as Error | undefined)?.message ??
                  'Failed to load transaction details'}
              </p>
            </div>
          ) : flowQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-100">
              <p className="text-sm font-semibold">Unable to load flow configuration</p>
              <p className="mt-1 text-sm">
                {(flowQuery.error as Error | undefined)?.message ??
                  'Failed to load flow configuration'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : !activeTransactionId ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <p className="font-semibold">No receiving transaction yet</p>
              <p>Create a new transaction to start receiving cargo packages.</p>
              {canCreateNewTransaction ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleCreateNewTransaction}
                  disabled={createTransaction.isPending}
                  loading={createTransaction.isPending}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  New transaction
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Transaction status
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {transactionStatus ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                      Created: {createdCount}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                      Inspected: {inspectedCount}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                      Stored: {storedCount}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canCreateNewTransaction ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={createTransaction.isPending}
                        loading={createTransaction.isPending}
                        onClick={handleCreateNewTransaction}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        New transaction
                      </Button>
                    ) : null}
                    {showComplete ? (
                      <Button
                        type="button"
                        variant="primary"
                        title={
                          canComplete
                            ? 'Complete transaction'
                            : 'Store all packages before completing'
                        }
                        onClick={() => {
                          if (!canComplete || transactionStatus === 'DONE') return;
                          completeMutation.mutate();
                        }}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Complete
                      </Button>
                    ) : null}
                    {showDelete ? (
                      <Button
                        type="button"
                        variant="danger"
                        title={
                          canDelete
                            ? 'Delete transaction'
                            : 'Delete is only allowed before any packages are created'
                        }
                        onClick={() => {
                          if (!canDelete) return;
                          deleteMutation.mutate();
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              {steps.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100">
                  <p className="text-sm font-semibold">No steps configured</p>
                  <p className="mt-1 text-sm">
                    Flow configuration returned an empty steps list.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {steps.map((step, index) => {
                    const isActive = index === activeStepIndex;
                    return (
                      <button
                        key={`${activeTransactionId}-${String(step.code)}-${index}`}
                        type="button"
                        onClick={() => setActiveStepIndex(index)}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${isActive
                          ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200'
                          : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60'
                          }`}
                      >
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {stepLabel(String(step.code))}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                              {String(step.fromStatus)} → {String(step.toStatus)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-4">
                {activeStepCode === 'create' ? (
                  <CargoCreateStep
                    packingListId={packingListId}
                    packageTransactionId={activeTransactionId}
                    orderNumber={item.serviceOrderNumber ?? null}
                    readOnly={readOnly}
                    onTransactionUpdated={handleTransactionUpdated}
                  />
                ) : null}

                {activeStepCode === 'inspect' ? (
                  <CargoPackageCheck
                    embedded
                    packingListId={packingListId}
                    packingListLabel={item.packingListNumber ?? null}
                    packageTransactionId={activeTransactionId}
                    inspectionQueueStatus={
                      typeof activeStep?.fromStatus === 'string'
                        ? (activeStep.fromStatus as PositionStatus)
                        : null
                    }
                    inspectionCompletedStatus={
                      typeof activeStep?.toStatus === 'string'
                        ? (activeStep.toStatus as PositionStatus)
                        : null
                    }
                    readOnly={readOnly}
                    onTransactionUpdated={handleTransactionUpdated}
                  />
                ) : null}

                {activeStepCode === 'store' ? (
                  <CargoPackageStore
                    embedded
                    packingListId={packingListId}
                    packingListLabel={item.packingListNumber ?? null}
                    packingListPreview={packingListPreview}
                    packageTransactionId={activeTransactionId}
                    storeQueueStatus={
                      typeof activeStep?.fromStatus === 'string'
                        ? (activeStep.fromStatus as PositionStatus)
                        : null
                    }
                    storeCompletedStatus="STORED"
                    readOnly={readOnly}
                    onTransactionUpdated={handleTransactionUpdated}
                  />
                ) : null}

                {activeStepCode &&
                  activeStepCode !== 'create' &&
                  activeStepCode !== 'inspect' &&
                  activeStepCode !== 'store' ? (
                  <StepNotImplemented code={activeStepCode} />
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportCargoReceivingTransactionModal;
