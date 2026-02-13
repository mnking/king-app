import React from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PositionStatus } from '@/features/cargo-package-storage/types';
import type { PackingListWorkingStatus } from '@/features/packing-list/types';
import { CargoPackageSelect } from '@/shared/features/cargo-package-select';
import { CargoPackageCheck } from '@/shared/features/cargo-package-check';
import { CargoPackageHandover } from '@/shared/features/cargo-package-handover';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/hooks';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import { useAuth } from '@/features/auth/useAuth';

import { packageTransactionQueryKeys, usePackageTransaction } from '../hooks/use-package-transactions';
import type {
  PackageTransaction,
  PackageTransactionPartyType,
} from '../types/package-transaction-types';

type FlowStep = { code: string; fromStatus: unknown; toStatus: unknown };

const StepNotImplemented: React.FC<{ code: string }> = ({ code }) => (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-semibold">Step not implemented</p>
        <p className="text-sm opacity-90">
          This client does not support step code <span className="font-mono">{code}</span> yet.
        </p>
      </div>
    </div>
  </div>
);

const stepLabel = (code: string) => {
  switch (code) {
    case 'select':
      return 'Select';
    case 'inspect':
      return 'Inspect';
    case 'handover':
      return 'Handover';
    case 'create':
      return 'Create';
    case 'store':
      return 'Store';
    default:
      return code;
  }
};

const formatTransactionTimestamp = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const transactionStatusBadge = (status: PackageTransaction['status']) => {
  if (status === 'DONE') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200';
  }
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
};

const partyTypeLabel = (partyType: PackageTransactionPartyType | null) => {
  switch (partyType) {
    case 'FORWARDER':
      return 'Forwarder';
    case 'CONSIGNEE':
      return 'Consignee';
    case 'SHIPPER':
      return 'Shipper';
    default:
      return '—';
  }
};

export const TransactionFlowAccordionItem: React.FC<{
  flowName: string;
  packingListId: string;
  packingListNumber: string | null;
  packingListMeta: {
    hblCode: string | null;
    forwarderName: string | null;
    containerNumber: string | null;
    vessel: string | null;
    voyage: string | null;
    workingStatus: PackingListWorkingStatus | null;
    note: string | null;
  };
  transaction: PackageTransaction;
  direction: string | null | undefined;
  steps: FlowStep[];
  expanded: boolean;
  onToggle: () => void;
}> = ({
  flowName,
  packingListId,
  packingListNumber,
  packingListMeta,
  transaction,
  direction,
  steps,
  expanded,
  onToggle,
}) => {
  const toast = useToast();
  const { can } = useAuth();
  const canWriteDelivery = can?.('cargo_delivery:write') ?? false;
  const queryClient = useQueryClient();
  const transactionQuery = usePackageTransaction(transaction.id, {
    enabled: expanded,
  });

  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (!expanded) return;
    setActiveIndex(0);
  }, [expanded, steps.length]);

  const activeStep = steps[activeIndex];
  const activeCode = activeStep?.code ?? '';

  const transactionDetail = transactionQuery.data ?? null;
  const hasTransactionDetail = Boolean(transactionDetail);
  const transactionPackages = transactionDetail?.packages ?? [];

  const inspectStep = React.useMemo(
    () => steps.find((step) => String(step.code) === 'inspect') ?? null,
    [steps],
  );
  const handoverStep = React.useMemo(
    () => steps.find((step) => String(step.code) === 'handover') ?? null,
    [steps],
  );

  const inspectToStatus =
    typeof inspectStep?.toStatus === 'string' ? (inspectStep.toStatus as PositionStatus) : null;
  const handoverToStatus =
    typeof handoverStep?.toStatus === 'string' ? (handoverStep.toStatus as PositionStatus) : null;

  const pickedCount = transactionPackages.length;
  const inspectedCount = inspectToStatus
    ? transactionPackages.filter((pkg) => pkg.positionStatus === inspectToStatus).length
    : 0;
  const handedOverCount = handoverToStatus
    ? transactionPackages.filter((pkg) => pkg.positionStatus === handoverToStatus).length
    : 0;

  const canComplete =
    hasTransactionDetail && pickedCount > 0 && handedOverCount === pickedCount;
  const completeTitle =
    !hasTransactionDetail
      ? 'Expand transaction to load latest package status.'
      : pickedCount === 0
      ? 'Pick at least one package before completing the transaction.'
      : handedOverCount !== pickedCount
        ? 'Hand over all picked packages before completing the transaction.'
        : 'Complete transaction';

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await packageTransactionsApi.complete(transaction.id);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Transaction completed.');
      void transactionQuery.refetch();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to complete transaction';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await packageTransactionsApi.delete(transaction.id);
    },
    onSuccess: () => {
      toast.success('Transaction deleted.');
      queryClient.invalidateQueries({ queryKey: packageTransactionQueryKeys.lists() });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to delete transaction';
      toast.error(message);
    },
  });

  const transactionStatus = transactionDetail?.status ?? transaction.status;
  const readOnly = transactionStatus === 'DONE' || !canWriteDelivery;
  const canDelete = hasTransactionDetail && pickedCount === 0 && !readOnly;
  const deleteTitle = readOnly
    ? 'Transaction already completed.'
    : !hasTransactionDetail
      ? 'Expand transaction to load latest package status.'
    : pickedCount > 0
      ? 'Cannot delete transaction after packages are picked.'
      : 'Delete transaction';

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canWriteDelivery) {
      toast.error('You do not have permission to modify cargo package delivery.');
      return;
    }
    if (!canDelete) return;

    const confirmed = await toast.confirm('This will delete the transaction', {
      intent: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    deleteMutation.mutate();
  };

  const handleComplete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canWriteDelivery) {
      toast.error('You do not have permission to modify cargo package delivery.');
      return;
    }
    if (!canComplete || transactionStatus === 'DONE') return;
    completeMutation.mutate();
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow dark:bg-gray-900 ${
        expanded
          ? 'border-blue-300 shadow-lg ring-1 ring-blue-200 dark:border-blue-900/60 dark:ring-blue-900/30'
          : 'border-gray-200 hover:shadow-md dark:border-gray-800'
      }`}
    >
      {expanded ? (
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-1 bg-blue-600 dark:bg-blue-500"
        />
      ) : null}
      <div
        className={`p-4 transition ${
          expanded
            ? 'bg-blue-50/40 dark:bg-blue-900/10'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
        }`}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <button
            type="button"
            onClick={onToggle}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {transaction.code || transaction.id}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${transactionStatusBadge(
                  transactionStatus,
                )}`}
              >
                {transactionStatus}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-200">
                {partyTypeLabel(transaction.partyType)} • {transaction.partyName ?? '—'}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Created {formatTransactionTimestamp(transaction.createdAt)} • Flow:{' '}
              <span className="font-mono">{transaction.businessProcessFlow ?? flowName}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold dark:bg-gray-800">
                PL: {packingListNumber ?? '—'}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold dark:bg-gray-800">
                HBL: {packingListMeta.hblCode ?? '—'}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold dark:bg-gray-800">
                Container: {packingListMeta.containerNumber ?? '—'}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold dark:bg-gray-800">
                Direction: {direction?.toUpperCase?.() ?? '—'}
              </span>
            </div>
          </button>

          <div className="flex flex-col items-start gap-2 xl:items-end">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-200">
              <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
                Picked: {hasTransactionDetail ? pickedCount : '—'}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
                Inspected: {hasTransactionDetail ? inspectedCount : '—'}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
                Handed over: {hasTransactionDetail ? handedOverCount : '—'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {expanded ? (
                <>
                  <Button
                    variant="primary"
                    loading={completeMutation.isPending}
                    disabled={
                      !canComplete ||
                      transactionStatus === 'DONE' ||
                      completeMutation.isPending ||
                      deleteMutation.isPending ||
                      !canWriteDelivery
                    }
                    title={transactionStatus === 'DONE' ? 'Transaction already completed.' : completeTitle}
                    onClick={handleComplete}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Done
                  </Button>
                  <Button
                    variant="danger"
                    loading={deleteMutation.isPending}
                    disabled={
                      !canDelete ||
                      deleteMutation.isPending ||
                      completeMutation.isPending ||
                      !canWriteDelivery
                    }
                    title={deleteTitle}
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Transaction
                  </Button>
                </>
              ) : null}
              <button
                type="button"
                onClick={onToggle}
                aria-label={expanded ? 'Collapse transaction details' : 'Expand transaction details'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          {transactionQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : transactionQuery.isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
              <p className="text-sm font-semibold">Unable to load transaction</p>
              <p className="mt-1 text-sm opacity-90">
                {(transactionQuery.error as Error | undefined)?.message ??
                  'Failed to load transaction'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  <p className="text-sm font-semibold">No steps configured</p>
                  <p className="mt-1 text-sm opacity-90">
                    Flow configuration returned an empty steps list.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {steps.map((step, index) => {
                    const isActive = index === activeIndex;
                    return (
                      <button
                        key={`${transaction.id}-${String(step.code)}-${index}`}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                          isActive
                            ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200'
                            : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {stepLabel(String(step.code))}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-200">
                              -
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {String(step.fromStatus)} → {String(step.toStatus)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-4">
                {activeCode === 'select' && (
                  <CargoPackageSelect
                    packingListId={packingListId}
                    plNumber={packingListNumber ?? '—'}
                    transactionId={transaction.id}
                    readOnly={readOnly}
                    availablePackagesStatus={
                      typeof activeStep?.fromStatus === 'string'
                        ? (activeStep.fromStatus as PositionStatus)
                        : undefined
                    }
                    pickedPackagesStatus={
                      typeof activeStep?.toStatus === 'string'
                        ? (activeStep.toStatus as PositionStatus)
                        : undefined
                    }
                    hblNumber={packingListMeta.hblCode}
                    workingStatus={packingListMeta.workingStatus}
                    containerNumber={packingListMeta.containerNumber}
                    vessel={packingListMeta.vessel}
                    voyage={packingListMeta.voyage}
                    note={packingListMeta.note}
                    onSubmitSuccess={() => {
                      void transactionQuery.refetch();
                    }}
                  />
                )}

                {activeCode === 'inspect' && (
                  <CargoPackageCheck
                    embedded
                    packingListId={packingListId}
                    packingListLabel={packingListNumber}
                    hblNumber={packingListMeta.hblCode}
                    packageTransactionId={transaction.id}
                    readOnly={readOnly}
                    inspectionQueueStatus={
                      typeof activeStep?.fromStatus === 'string'
                        ? (activeStep.fromStatus as PositionStatus)
                        : undefined
                    }
                    inspectionCompletedStatus={
                      typeof activeStep?.toStatus === 'string'
                        ? (activeStep.toStatus as PositionStatus)
                        : undefined
                    }
                    onTransactionUpdated={() => transactionQuery.refetch()}
                  />
                )}

                {activeCode === 'handover' && (
                  <CargoPackageHandover
                    embedded
                    packingListId={packingListId}
                    packingListLabel={packingListNumber}
                    hblNumber={packingListMeta.hblCode}
                    packageTransactionId={transaction.id}
                    readOnly={readOnly}
                    handoverQueueStatus={
                      typeof activeStep?.fromStatus === 'string'
                        ? (activeStep.fromStatus as PositionStatus)
                        : undefined
                    }
                    handoverCompletedStatus={
                      typeof activeStep?.toStatus === 'string'
                        ? (activeStep.toStatus as PositionStatus)
                        : undefined
                    }
                    onTransactionUpdated={() => transactionQuery.refetch()}
                  />
                )}

                {activeCode !== 'select' &&
                  activeCode !== 'inspect' &&
                  activeCode !== 'handover' &&
                  activeCode && <StepNotImplemented code={String(activeCode)} />}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
