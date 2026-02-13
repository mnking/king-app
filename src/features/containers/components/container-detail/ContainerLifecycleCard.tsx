import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  containerTransactionQueryKeys,
} from '@/features/containers/hooks/use-container-transactions';
import { listContainerTransactions } from '@/services/apiContainerTransactions';
import type {
  Container,
  ContainerCycle,
  ContainerTransaction,
} from '@/features/containers/types';
import ContainerStatusDiagram from './ContainerStatusDiagram';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';
import { formatCycleSummary, isCycleDisplayable } from '@/features/containers/utils/cycleStatus';
import { useContainerLifecycle } from '@/features/containers/hooks/useContainerLifecycle';

type Props = {
  container: Container;
  activeCycle?: ContainerCycle | null;
  onClose?: () => void;
  onReload?: () => void;
};

export const ContainerLifecycleCard: React.FC<Props> = ({
  container,
  activeCycle,
  onClose,
  onReload,
}) => {

  // Use active cycle strictly
  const currentActiveCycle = activeCycle || (container as any).currentCycle;
  const activeCycleId = currentActiveCycle?.id;

  const cycleTransactionsParams = useMemo(
    () => ({
      containerNumber: container.number,
      cycleId: activeCycleId,
      itemsPerPage: 100, // Get more transactions for cycle view
    }),
    [container.number, activeCycleId],
  );

  // Query for transactions of the selected (ACTIVE) cycle
  const activeCycleTransactionsQuery = useQuery({
    queryKey: containerTransactionQueryKeys.list(cycleTransactionsParams),
    queryFn: async () => {
      if (!activeCycleId) return { results: [], total: 0 };
      const response = await listContainerTransactions(cycleTransactionsParams);
      return response.data;
    },
    enabled: Boolean(activeCycleId),
    staleTime: 0,
  });

  const transactions = useMemo(() => {
    return activeCycleTransactionsQuery.data?.results ?? [];
  }, [activeCycleTransactionsQuery.data]);

  // Use the new hook to process lifecycle data directly from transactions
  const lifecycleData = useContainerLifecycle(transactions);

  const activeCycleSummary = useMemo(
    () => formatCycleSummary(currentActiveCycle, { fallback: null }),
    [currentActiveCycle],
  );

  // This refers to whether the container ITSELF has an active cycle right now
  const hasCurrentActiveCycle = isCycleDisplayable(currentActiveCycle) && Boolean(activeCycleSummary);

  const statusBadges = useMemo(() => {
    const seen = new Set<string>();
    return transactions
      .map((txn) => txn.status?.trim())
      .filter((status): status is string => Boolean(status))
      .filter((status) => {
        if (seen.has(status)) return false;
        seen.add(status);
        return true;
      });
  }, [transactions]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700  sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Container detail</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{container.number}</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="self-start rounded-full border border-transparent p-1 text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:text-gray-300"
              >
                ✕
              </button>
            )}
            {onReload && (
              <button
                onClick={onReload}
                className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-gray-600 dark:text-gray-200 dark:hover:border-gray-500"
              >
                Refresh timeline
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 dark:text-gray-200 sm:grid-cols-2">
            <div>
              <div className="text-xs text-gray-500">Container Number</div>
              <div className="font-medium">{container.number}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Type</div>
              <div className="font-medium">
                {container.containerType?.size ?? container.containerTypeCode}
              </div>
            </div>
            {hasCurrentActiveCycle && (
              <>
                <div>
                  <div className="text-xs text-gray-500">Current Cycle</div>
                  <div className="font-medium">
                    {activeCycleSummary ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    Current Cycle Transactions
                  </div>
                  <div className="font-medium">
                    {(activeCycleTransactionsQuery.data?.results?.length ?? 0) > 0
                      ? activeCycleTransactionsQuery.data?.results.length
                      : activeCycleTransactionsQuery.isLoading
                        ? 'Loading...'
                        : '—'}
                  </div>
                </div>
              </>
            )}
            {statusBadges.length > 0 && (
              <div>
                <div className="text-xs text-gray-500">Statuses</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {statusBadges.map((status) => (
                    <span
                      key={status}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-0.5 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {transactions.find(t => t.status === status)?.displayStatus || status}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500">Created At</div>
              <div className="font-medium">
                {formatDateTimeForDisplay(container.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Updated At</div>
              <div className="font-medium">
                {formatDateTimeForDisplay(container.updatedAt)}
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Container state timeline
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {activeCycleSummary || 'No cycle context'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <ContainerStatusDiagram
                lifecycleData={lifecycleData}
                isLoading={activeCycleTransactionsQuery.isLoading}
              />
            </div>
          </div>
        </div>

      </div>

      <div className="mt-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Transactions
            </h4>
            {(activeCycleTransactionsQuery.isLoading) && (
              <span className="text-xs text-gray-500">Loading…</span>
            )}
          </div>
          {activeCycleId ? (
            activeCycleTransactionsQuery.isLoading ? null : (
              <div className="space-y-3">
                {(activeCycleTransactionsQuery.data?.results ?? []).map((t: ContainerTransaction) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-gray-100 bg-white p-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-gray-200 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{t.eventType}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {t.createdAt || t.timestamp
                          ? formatDateTimeForDisplay(t.createdAt ?? t.timestamp)
                          : '—'}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {t.cargoLoading && (
                        <span className="inline-flex max-w-full items-center truncate rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400" title={t.cargoLoading}>
                          <span className="mr-1 opacity-70">Cargo:</span>
                          <span className="truncate">{t.cargoLoading}</span>
                        </span>
                      )}
                      {t.condition && (
                        <span className="inline-flex max-w-full items-center truncate rounded-md bg-purple-50 px-2 py-1 font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 dark:bg-purple-900/30 dark:text-purple-400" title={t.condition}>
                          <span className="mr-1 opacity-70">Cond:</span>
                          <span className="truncate">{t.condition}</span>
                        </span>
                      )}
                      {t.customsStatus && (
                        <span className="inline-flex max-w-full items-center truncate rounded-md bg-yellow-50 px-2 py-1 font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-500" title={t.customsStatus}>
                          <span className="mr-1 opacity-70">Customs:</span>
                          <span className="truncate">{t.customsStatus}</span>
                        </span>
                      )}
                      {t.sealNumber && (
                        <span className="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-800 dark:text-gray-300 break-all" title={t.sealNumber}>
                          <span className="mr-1 opacity-70 whitespace-nowrap">Seal:</span>
                          <span className="font-mono">{t.sealNumber}</span>
                        </span>
                      )}
                    </div>

                    {t.details && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 text-justify break-words">
                        <span className="font-medium text-gray-900 dark:text-gray-100">Note: </span>
                        {t.details}
                      </div>
                    )}
                  </div>
                ))}
                {activeCycleTransactionsQuery.data && activeCycleTransactionsQuery.data.results.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900">
                    No transactions found for this cycle
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="text-sm text-gray-500">No active cycle selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContainerLifecycleCard;
