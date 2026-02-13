import React, { useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import EntityTable, {
  type EntityAction,
  type EntityColumn,
} from '@/shared/components/EntityTable';
import { Button } from '@/shared/components/ui/Button';
import { useToast } from '@/shared/hooks/useToast';
import { useAuth } from '@/features/auth/useAuth';
import {
  useContainerTransactions,
  useContainerTransactionsByContainer,
} from '@/features/containers/hooks/use-container-transactions';
import { ContainerTransactionFormModal } from './ContainerTransactionFormModal';
import type { ContainerTransaction } from '@/features/containers/types';
import type { ContainerTransactionFormValues } from '@/features/containers/schemas';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';

interface ContainerTransactionsModalProps {
  isOpen: boolean;
  containerNumber: string | null;
  onClose: () => void;
}

export const ContainerTransactionsModal: React.FC<
  ContainerTransactionsModalProps
> = ({ isOpen, containerNumber, onClose }) => {
  const toast = useToast();
  const { can } = useAuth();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  const canManage = can('container_management:write');
  const params = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      order: 'createdAt:DESC',
      containerNumber: containerNumber ?? undefined,
    }),
    [containerNumber, pagination],
  );

  const transactionQuery = useContainerTransactionsByContainer(
    containerNumber ?? '',
    params,
  );
  const transactionCrud = useContainerTransactions();

  const columns: EntityColumn<ContainerTransaction>[] = [
    {
      key: 'eventType',
      label: 'Event',
      render: (transaction) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {transaction.eventType.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {transaction.status ?? '—'}
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

  const actions: EntityAction<ContainerTransaction>[] = canManage
    ? [
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          variant: 'destructive' as const,
          onClick: async (transaction) => {
            const confirmed = await toast.confirm('Delete this transaction?');
            if (!confirmed) return;
            await transactionCrud.deleteEntity(transaction.id);
            toast.success('Transaction deleted');
            transactionQuery.refetch();
          },
        },
      ]
    : [];

  const handleSave = async (values: ContainerTransactionFormValues) => {
    try {
      await transactionCrud.createEntity(values);
      toast.success('Transaction recorded');
      transactionQuery.refetch();
      setIsFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record transaction');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {containerNumber ? `Container ${containerNumber}` : 'Transactions'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(true)}
              >
                New transaction
              </Button>
            )}
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-4">
          <EntityTable
            entities={transactionQuery.data?.results ?? []}
            loading={transactionQuery.isLoading}
            fetching={transactionQuery.isFetching}
            error={null}
            entityName="Transaction"
            entityNamePlural="Transactions"
            getId={(transaction) => transaction.id}
            columns={columns}
            actions={actions}
            enableServerSidePagination
            pagination={pagination}
            onPaginationChange={setPagination}
            totalCount={transactionQuery.data?.total ?? 0}
            emptyStateMessage="No transactions recorded"
          />
        </div>
      </div>
      {canManage && (
        <ContainerTransactionFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          initialValues={{
            containerNumber: containerNumber ?? '',
            eventType: 'GATE_IN',
            timestamp: new Date().toISOString(),
          }}
          onSubmit={handleSave}
          isSubmitting={transactionCrud.isCreating}
        />
      )}
    </div>
  );
};
