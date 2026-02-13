import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { CargoPackageSelection } from '@/shared/features/cargo-package-selection';
import { CargoPackageCheck } from '@/shared/features/cargo-package-check';
import { CargoPackageStuffing } from '@/shared/features/cargo-package-stuffing';
import type { PositionStatus } from '@/features/cargo-package-storage/types';
import { usePackingList } from '@/features/packing-list';
import type { StuffingPackageTransaction } from '@/features/stuffing-execution/types';
import type { BusinessFlowStep } from '@/services/apiCargoInspection';

interface StuffingTransactionPanelProps {
  packingListId: string;
  transaction: StuffingPackageTransaction | null;
  flowSteps: BusinessFlowStep[];
  readOnly?: boolean;
  onRefreshTransactions?: () => void;
}

const stepLabel = (code: string) => {
  switch (code) {
    case 'select':
      return 'Select';
    case 'inspect':
      return 'Inspect';
    case 'stuffing':
      return 'Stuffing';
    default:
      return code;
  }
};

export const StuffingTransactionPanel = ({
  packingListId,
  transaction,
  flowSteps,
  readOnly = false,
  onRefreshTransactions,
}: StuffingTransactionPanelProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [transaction?.id, flowSteps.length]);

  const packingListQuery = usePackingList(packingListId, {
    enabled: Boolean(packingListId),
  });

  const meta = {
    hblCode: packingListQuery.data?.hblData?.hblCode ?? null,
    forwarderName: packingListQuery.data?.hblData?.forwarderName ?? null,
    containerNumber: packingListQuery.data?.hblData?.containerNumber ?? null,
    vessel: packingListQuery.data?.hblData?.vessel ?? null,
    voyage: packingListQuery.data?.hblData?.voyage ?? null,
    workingStatus: packingListQuery.data?.workingStatus ?? null,
    note: packingListQuery.data?.note ?? null,
  };

  const activeStep = flowSteps[activeIndex];
  const activeCode = activeStep?.code ? String(activeStep.code) : '';
  if (!transaction) {
    return null;
  }

  if (packingListQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  const isReadOnly = readOnly;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="px-6 py-4">
        {flowSteps.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            <p className="text-sm font-semibold">No steps configured</p>
            <p className="mt-1 text-sm opacity-90">Flow configuration returned an empty list.</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {flowSteps.map((step, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={`${packingListId}-${String(step.code)}-${index}`}
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
                    <div className="text-sm font-semibold">
                      {stepLabel(String(step.code))}
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

        <div className="mt-4 space-y-4">
          {activeCode === 'select' && (
            <CargoPackageSelection
              packingListId={packingListId}
              plNumber={packingListQuery.data?.packingListNumber ?? '—'}
              transactionId={transaction.id}
              readOnly={isReadOnly}
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
              hblNumber={meta.hblCode}
              workingStatus={meta.workingStatus}
              containerNumber={meta.containerNumber}
              vessel={meta.vessel}
              voyage={meta.voyage}
              forwarderName={meta.forwarderName}
              note={meta.note}
              onSubmitSuccess={() => {
                onRefreshTransactions?.();
              }}
            />
          )}

          {activeCode === 'inspect' && (
            <CargoPackageCheck
              embedded
              packingListId={packingListId}
              packingListLabel={packingListQuery.data?.packingListNumber ?? null}
              hblNumber={meta.hblCode}
              packageTransactionId={transaction.id}
              readOnly={isReadOnly}
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
              onTransactionUpdated={() => {
                onRefreshTransactions?.();
              }}
            />
          )}

          {activeCode === 'stuffing' && (
            <CargoPackageStuffing
              embedded
              packingListId={packingListId}
              packingListLabel={packingListQuery.data?.packingListNumber ?? null}
              packageTransactionId={transaction.id}
              readOnly={isReadOnly}
              stuffingQueueStatus={
                typeof activeStep?.fromStatus === 'string'
                  ? (activeStep.fromStatus as PositionStatus)
                  : undefined
              }
              stuffingCompletedStatus={
                typeof activeStep?.toStatus === 'string'
                  ? (activeStep.toStatus as PositionStatus)
                  : undefined
              }
              onTransactionUpdated={() => {
                onRefreshTransactions?.();
              }}
            />
          )}

          {activeCode !== 'select' &&
            activeCode !== 'inspect' &&
            activeCode !== 'stuffing' &&
            activeCode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                <p className="text-sm font-semibold">Step not implemented</p>
                <p className="mt-1 text-sm opacity-90">
                  This client does not support step code{' '}
                  <span className="font-mono">{activeCode}</span> yet.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StuffingTransactionPanel;
