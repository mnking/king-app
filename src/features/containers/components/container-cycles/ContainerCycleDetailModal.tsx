import React from 'react';
import { X } from 'lucide-react';
import type { ContainerCycle } from '@/features/containers/types';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';

interface ContainerCycleDetailModalProps {
  isOpen: boolean;
  cycleId: string;
  isLoading: boolean;
  cycle: ContainerCycle | undefined;
  onClose: () => void;
}

export const ContainerCycleDetailModal: React.FC<ContainerCycleDetailModalProps> = ({
  isOpen,
  isLoading,
  cycle,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  const transactions = cycle?.transactions ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Container Cycle Details
            </h2>
            {cycle && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {cycle.containerNumber} · {cycle.code}
              </p>
            )}
          </div>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400" />
            </div>
          )}

          {!isLoading && cycle && (
            <>
              {/* Cycle Information */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Cycle Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Container Number
                    </p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                      {cycle.containerNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Cycle Code
                    </p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                      {cycle.code}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </p>
                    <p className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          cycle.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {cycle.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Container Status
                    </p>
                    <p className="mt-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 inline-flex dark:bg-blue-500/20 dark:text-blue-200">
                      {cycle.containerStatus}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Operation Mode
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {cycle.operationMode || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Cargo Loading
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {cycle.cargoLoading || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Start Event
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {cycle.startEvent}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      End Event
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {cycle.endEvent || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Customs Status
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {cycle.customsStatus || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Condition
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {cycle.condition || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Seal Number
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {cycle.sealNumber || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Active
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {cycle.isActive ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Timeline
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Created
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {formatDateTimeForDisplay(cycle.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Last Updated
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {formatDateTimeForDisplay(cycle.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transactions */}
              {transactions.length > 0 && (
                <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Transactions ({transactions.length})
                  </h3>
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200">
                                {transaction.eventType}
                              </span>
                              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-500/20 dark:text-blue-200">
                                {transaction.status}
                              </span>
                            </div>
                            <div className="mt-2 grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Cargo Loading
                                </p>
                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                  {transaction.cargoLoading || '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Seal Number
                                </p>
                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                  {transaction.sealNumber || '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Customs Status
                                </p>
                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                  {transaction.customsStatus || '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Condition
                                </p>
                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                  {transaction.condition || '—'}
                                </p>
                              </div>
                            </div>
                            {transaction.containerSnapshot?.containerType && (
                              <div className="mt-3">
                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Container Type
                                </p>
                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                  {transaction.containerSnapshot.containerType.code} • {transaction.containerSnapshot.containerType.size}
                                  {transaction.containerSnapshot.containerType.description &&
                                    ` · ${transaction.containerSnapshot.containerType.description}`}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                            <p className="font-medium text-gray-700 dark:text-gray-200">
                              {formatDateTimeForDisplay(transaction.timestamp || transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {transactions.length === 0 && (
                <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    No transactions recorded for this cycle.
                  </p>
                </div>
              )}
            </>
          )}

          {!isLoading && !cycle && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Failed to load cycle details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContainerCycleDetailModal;
