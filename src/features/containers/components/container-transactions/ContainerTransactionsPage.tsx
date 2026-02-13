import React, { useEffect, useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { useContainerTransactionList } from '@/features/containers/hooks/use-container-transactions';
import type { ContainerTransaction } from '@/features/containers/types';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';
import PaginationInfo from '@/shared/components/pagination/PaginationInfo';
import PaginationControls from '@/shared/components/pagination/PaginationControls';

export const ContainerTransactionsPage: React.FC = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [filters, setFilters] = useState<FilterValues>({});

  const params = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      order: 'createdAt:DESC',
      containerNumber: filters.containerNumber as string,
      eventType: filters.eventType as string,
      dateFrom: filters.dateFrom as string,
      dateTo: filters.dateTo as string,
    }),
    [pagination.pageIndex, pagination.pageSize, filters],
  );

  const transactionQuery = useContainerTransactionList(params);

  const transactions = useMemo(
    () => transactionQuery.data?.results ?? [],
    [transactionQuery.data?.results],
  );
  const totalCount = transactionQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const canPreviousPage = pagination.pageIndex > 0;
  const canNextPage = pagination.pageIndex < totalPages - 1;

  const summaryStats = useMemo(() => {
    const uniqueContainers = new Set<string>();
    let lastUpdated: string | null = null;
    const statusCounts: Record<string, number> = {};

    transactions.forEach((transaction) => {
      uniqueContainers.add(transaction.containerNumber);
      const timestamp = transaction.timestamp ?? transaction.createdAt;
      if (timestamp) {
        if (!lastUpdated || new Date(timestamp).getTime() > new Date(lastUpdated).getTime()) {
          lastUpdated = timestamp;
        }
      }
      if (transaction.status) {
        statusCounts[transaction.status] = (statusCounts[transaction.status] ?? 0) + 1;
      }
    });

    const topStatuses = Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    return {
      total: totalCount,
      uniqueContainers: uniqueContainers.size,
      lastUpdated,
      topStatuses,
    };
  }, [transactions, totalCount]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<
      string,
      {
        containerNumber: string;
        cycleId: string;
        containerType: ContainerTransaction['containerSnapshot']['containerType'];
        transactions: ContainerTransaction[];
      }
    >();

    transactions.forEach((transaction) => {
      if (!groups.has(transaction.containerNumber)) {
        groups.set(transaction.containerNumber, {
          containerNumber: transaction.containerNumber,
          cycleId: transaction.cycleId,
          containerType: transaction.containerSnapshot?.containerType ?? null,
          transactions: [],
        });
      }
      groups.get(transaction.containerNumber)!.transactions.push(transaction);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      transactions: [...group.transactions].sort((a, b) => {
        const aTime = new Date(a.timestamp ?? a.createdAt).getTime();
        const bTime = new Date(b.timestamp ?? b.createdAt).getTime();
        return bTime - aTime;
      }),
    }));
  }, [transactions]);

  const [expandedContainers, setExpandedContainers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedContainers((prev) => {
      const next: Record<string, boolean> = {};
      groupedTransactions.forEach((group) => {
        next[group.containerNumber] = prev[group.containerNumber] ?? false;
      });
      return next;
    });
  }, [groupedTransactions]);

  const getEventBadgeClass = (eventType: string) => {
    if (eventType.includes('GATE')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200';
    if (eventType.includes('CFS')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200';
    if (eventType.includes('YARD')) return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200';
    if (eventType.includes('CUSTOMS')) return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getStatusBadgeClass = (status?: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300';
    if (status.includes('YARD')) return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200';
    if (status.includes('CFS')) return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200';
    if (status.includes('GATE')) return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
  };

  const handleFilter = (values: FilterValues) => {
    setFilters(values);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Container Transactions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Audit log for container moves and handoffs.
          </p>
        </div>
      </div>

      <DynamicFilter
        fields={[
          {
            type: 'text',
            name: 'containerNumber',
            label: 'Container Number',
          },
          {
            type: 'text',
            name: 'eventType',
            label: 'Event Type',
            placeholder: 'e.g. GATE_IN',
          },
          { type: 'date', name: 'dateFrom', label: 'From' },
          { type: 'date', name: 'dateTo', label: 'To' },
        ]}
        onApplyFilter={handleFilter}
        onClear={() => setFilters({})}
        initialValues={filters}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total Events
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">
            {summaryStats.total}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {pagination.pageIndex + 1} of {totalPages}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Unique Containers
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">
            {summaryStats.uniqueContainers}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {summaryStats.uniqueContainers === 1 ? 'container' : 'containers'} on this page
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Last Event
          </p>
          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {summaryStats.lastUpdated ? formatDateTimeForDisplay(summaryStats.lastUpdated) : '—'}
          </p>
          {summaryStats.topStatuses.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {summaryStats.topStatuses.map(([status, count]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {status} · {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {transactions.length === 0 && !transactionQuery.isLoading && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            No transactions recorded for the current filters.
          </div>
        )}

        {groupedTransactions.length > 0 && (
          <div className="space-y-6">
            {groupedTransactions.map((group) => {
              const isExpanded = expandedContainers[group.containerNumber] ?? true;
              const latestEvent = group.transactions[0];
              const containerType = group.containerType;

              return (
                <div key={group.containerNumber} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedContainers((prev) => ({
                        ...prev,
                        [group.containerNumber]: !isExpanded,
                      }))
                    }
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {group.containerNumber}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{group.cycleId}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{group.transactions.length} events</span>
                        {latestEvent && (
                          <span>
                            Last event · {formatDateTimeForDisplay(latestEvent.timestamp ?? latestEvent.createdAt)}
                          </span>
                        )}
                        {containerType && (
                          <span>
                            {containerType.code} • {containerType.size}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                        }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="mt-6 space-y-8">
                      {group.transactions.map((transaction, index) => {
                        const isLast = index === group.transactions.length - 1;
                        const snapshotType = transaction.containerSnapshot?.containerType;

                        return (
                          <div key={transaction.id} className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                              <span className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-sm dark:border-gray-900" />
                              {!isLast && <span className="mt-1 h-full w-px bg-gray-200 dark:bg-gray-700" />}
                            </div>

                            <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventBadgeClass(
                                        transaction.eventType,
                                      )}`}
                                    >
                                      {transaction.eventType.replace(/_/g, ' ')}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                                        transaction.status,
                                      )}`}
                                    >
                                      {transaction.status ?? 'No status'}
                                    </span>
                                    {transaction.cargoLoading && (
                                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        Cargo: {transaction.cargoLoading}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                      {transaction.containerNumber}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.cycleId}</p>
                                  </div>
                                </div>

                                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                                  <p className="font-medium text-gray-700 dark:text-gray-200">Recorded</p>
                                  <p>{formatDateTimeForDisplay(transaction.timestamp ?? transaction.createdAt)}</p>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-4 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Customs Status
                                  </p>
                                  <p>{transaction.customsStatus || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Seal Number
                                  </p>
                                  <p>{transaction.sealNumber || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Container Type
                                  </p>
                                  <p>
                                    {snapshotType
                                      ? `${snapshotType.code} • ${snapshotType.size} · ${snapshotType.description ?? '—'}`
                                      : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Condition
                                  </p>
                                  <p>{transaction.condition || '—'}</p>
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {transactionQuery.isLoading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Loading transactions…
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <PaginationInfo
              currentPage={pagination.pageIndex}
              pageSize={pagination.pageSize}
              totalCount={totalCount}
              currentPageSize={transactions.length}
              entityName="transaction"
              entityNamePlural="transactions"
            />

            <PaginationControls
              currentPage={pagination.pageIndex}
              totalPages={totalPages}
              pageSize={pagination.pageSize}
              onPageChange={(page) => setPagination((prev) => ({ ...prev, pageIndex: page }))}
              onPageSizeChange={(size) =>
                setPagination({
                  pageIndex: 0,
                  pageSize: size,
                })
              }
              canPreviousPage={canPreviousPage}
              canNextPage={canNextPage}
              disabled={transactionQuery.isFetching}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContainerTransactionsPage;
