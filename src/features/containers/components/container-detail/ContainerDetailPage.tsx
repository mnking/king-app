import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { AlertTriangle, PackageCheck, RefreshCw } from 'lucide-react';
import EntityTable, {
  type EntityColumn,
} from '@/shared/components/EntityTable';
import { Button } from '@/shared/components/ui/Button';
import { useToast } from '@/shared/hooks/useToast';
import { useAuth } from '@/features/auth/useAuth';
import { useContainer } from '@/features/containers/hooks/use-containers-query';
import { useContainerTransactionsByContainer } from '@/features/containers/hooks/use-container-transactions';
import { useContainerCycleList } from '@/features/containers/hooks/use-container-cycles';
import { ContainerTransactionFormModal } from '../container-transactions/ContainerTransactionFormModal';
import {
  containerTransactionsApi,
  type ContainerTransactionsByContainerParams,
} from '@/services/apiContainerTransactions';
import { containersApi } from '@/services/apiContainers';
import type { ContainerTransaction } from '@/features/containers/types';
import type { ContainerTransactionFormValues } from '@/features/containers/schemas';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';
import { formatCycleSummary } from '@/features/containers/utils/cycleStatus';
import ContainerLifecycleCard from './ContainerLifecycleCard';

const InfoCard: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-lg font-semibold text-gray-900 dark:text-gray-50 mt-1">{value}</p>
  </div>
);

export const ContainerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { can } = useAuth();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedCycleId, setSelectedCycleId] = useState<string>('all');

  const containerQuery = useContainer(id ?? '', { cycle: 'true' });
  const container = containerQuery.data;
  const containerNumber = container?.number ?? '';
  const cyclesQueryParams = useMemo(
    () => ({
      containerNumber: container?.number,
      order: 'createdAt:DESC',
      itemsPerPage: 50,
    }),
    [container?.number],
  );

  const cyclesQuery = useContainerCycleList(cyclesQueryParams);

  const handleReload = () => {
    containerQuery.refetch();
    cyclesQuery.refetch();
    transactionsQuery.refetch();
  };
  const transactionParams: ContainerTransactionsByContainerParams = useMemo(
    () => ({
      order: 'createdAt:DESC',
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      cycleId: selectedCycleId === 'all' ? undefined : selectedCycleId,
    }),
    [pagination.pageIndex, pagination.pageSize, selectedCycleId],
  );

  const transactionsQuery = useContainerTransactionsByContainer(
    containerNumber,
    transactionParams,
  );

  const {
    mutate: fetchLastTransaction,
    data: lastTransaction,
  } = useMutation({
    mutationFn: async () => {
      if (!id) return null;
      const response = await containersApi.getLastTransaction(id);
      return response.data;
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: containerTransactionsApi.create,
    onSuccess: () => {
      toast.success('Transaction recorded');
      transactionsQuery.refetch();
      containerQuery.refetch();
      cyclesQuery.refetch();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to record transaction',
      );
    },
  });

  const transactionColumns: EntityColumn<ContainerTransaction>[] = [
    {
      key: 'eventType',
      label: 'Event',
      render: (transaction) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {transaction.eventType.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {transaction.status}
          </p>
        </div>
      ),
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (transaction) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTimeForDisplay(transaction.timestamp)}
        </span>
      ),
    },
    {
      key: 'cargoLoading',
      label: 'Cargo',
      render: (transaction) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {transaction.cargoLoading ?? '—'}
        </span>
      ),
    },
    {
      key: 'customsStatus',
      label: 'Customs',
      render: (transaction) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {transaction.customsStatus ?? '—'}
        </span>
      ),
    },
  ];

  const canManage = can('container_management:write');

  const currentCycle = container?.currentCycle;
  const cycleStatus = currentCycle?.status ?? 'N/A';
  const statusStyles: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  };
  const statusBadgeClass = statusStyles[cycleStatus] ?? statusStyles.ACTIVE;

  useEffect(() => {
    if (id) {
      fetchLastTransaction();
    }
  }, [fetchLastTransaction, id]);

  useEffect(() => {
    if (container?.currentCycle?.id) {
      setSelectedCycleId(container.currentCycle.id);
    } else {
      setSelectedCycleId('all');
    }
  }, [container?.currentCycle?.id]);

  const handleCreateTransaction = async (values: ContainerTransactionFormValues) => {
    await createTransactionMutation.mutateAsync(values);
    setShowTransactionModal(false);
  };

  if (containerQuery.isLoading) {
    return (
      <div className="p-10 text-center text-gray-600 dark:text-gray-300">
        Loading container...
      </div>
    );
  }

  if (!container) {
    return (
      <div className="p-10 text-center text-gray-600 dark:text-gray-300">
        Container not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Container</p>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
              {container.number}
            </h1>
            {currentCycle && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}>
                {cycleStatus}
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Type {container.containerTypeCode} •{' '}
            {container.containerType?.size}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleReload}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reload data
          </Button>
          {canManage && (
            <Button onClick={() => setShowTransactionModal(true)}>
              Add Transaction
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          label="Created"
          value={formatDateTimeForDisplay(container.createdAt)}
        />
        <InfoCard
          label="Updated"
          value={formatDateTimeForDisplay(container.updatedAt)}
        />
        {currentCycle && (
          <InfoCard
            label="Current Cycle"
            value={currentCycle.code || '—'}
          />
        )}
        {currentCycle && (
          <InfoCard
            label="Cycle Status"
            value={currentCycle.status || '—'}
          />
        )}
        {currentCycle && (
          <InfoCard
            label="Transactions in Cycle"
            value={container.currentCycleTransactionCount ?? 0}
          />
        )}
      </div>

      <ContainerLifecycleCard
        container={container}
        activeCycle={container.currentCycle ?? undefined}
        onReload={handleReload}
      />

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Current cycle snapshot
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Detailed status from the container service API
            </p>
          </div>
          {currentCycle && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                {currentCycle.status || '—'}
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                {currentCycle.containerStatus ?? 'UNKNOWN'}
              </span>
            </div>
          )}
        </div>
        {currentCycle ? (
          <dl className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard label="Operation Mode" value={currentCycle.operationMode ?? '—'} />
            <InfoCard label="Start Event" value={currentCycle.startEvent ?? '—'} />
            <InfoCard label="End Event" value={currentCycle.endEvent ?? 'Not ended'} />
            <InfoCard label="Cargo Loading" value={currentCycle.cargoLoading ?? '—'} />
            <InfoCard label="Customs Status" value={currentCycle.customsStatus ?? '—'} />
            <InfoCard label="Condition" value={currentCycle.condition ?? '—'} />
            <InfoCard label="Seal Number" value={currentCycle.sealNumber ?? '—'} />
            <InfoCard label="Container Status" value={currentCycle.containerStatus ?? '—'} />
            <InfoCard label="Cycle Updated" value={formatDateTimeForDisplay(currentCycle.updatedAt)} />
          </dl>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <AlertTriangle className="h-5 w-5" />
            <span>No active cycle information available.</span>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Last Transaction
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Most recent event recorded
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLastTransaction()}
          >
            Refresh
          </Button>
        </div>
        {lastTransaction ? (
          <div className="mt-4 flex items-center gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <PackageCheck className="h-10 w-10 text-blue-500" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-300">
                {lastTransaction.eventType.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {formatDateTimeForDisplay(lastTransaction.timestamp)}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Status: {lastTransaction.status ?? '—'}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No transaction data available.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Transactions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Detailed event history for this container
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Cycle filter
            </label>
            <select
              value={selectedCycleId}
              onChange={(event) => {
                setSelectedCycleId(event.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">All cycles</option>
              {(cyclesQuery.data?.results ?? []).map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {formatCycleSummary(cycle, { separator: ' • ', fallback: '—' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        <EntityTable
          entities={transactionsQuery.data?.results ?? []}
          loading={transactionsQuery.isLoading}
          fetching={transactionsQuery.isFetching}
          error={null}
          entityName="Transaction"
          entityNamePlural="Transactions"
          getId={(transaction) => transaction.id}
          columns={transactionColumns}
          actions={[]}
          enableServerSidePagination
          pagination={pagination}
          onPaginationChange={setPagination}
          totalCount={transactionsQuery.data?.total ?? 0}
          emptyStateMessage="No transactions recorded"
        />
      </section>

      {canManage && (
        <ContainerTransactionFormModal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          onSubmit={handleCreateTransaction}
          isSubmitting={createTransactionMutation.isPending}
          initialValues={{
            containerNumber,
            cycleId: currentCycle?.id,
            eventType: 'GATE_IN',
            timestamp: new Date().toISOString(),
          }}
        />
      )}
    </div>
  );
};

export default ContainerDetailPage;
