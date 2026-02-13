import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';

import type { PackingListWorkingStatus } from '@/features/packing-list/types';
import { usePackingList } from '@/features/packing-list/hooks';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useAuth } from '@/features/auth/useAuth';
import { useToast } from '@/shared/hooks';
import { getHBL } from '@/services/apiForwarder';
import { fetchCargoPackagesByPackingList } from '@/services/apiCargoPackages';

import { useBusinessFlowConfig } from '../hooks/use-business-flow-config';
import {
  useCreatePackageTransaction,
  usePackageTransactions,
} from '../hooks/use-package-transactions';
import type { CreatePackageTransactionPayload } from '../types/package-transaction-types';

import { CreateTransactionModal } from './CreateTransactionModal';
import { TransactionFlowAccordionItem } from './TransactionFlowAccordionItem';

const FLOW_NAME = 'warehouseDelivery';

export const PackingListTransactionsPanel: React.FC<{
  packingListId: string | null;
  bookingOrderCode?: string | null;
}> = ({ packingListId, bookingOrderCode }) => {
  const { can } = useAuth();
  const toast = useToast();
  const canWriteDelivery = can?.('cargo_delivery:write') ?? false;
  const packingListQuery = usePackingList(packingListId ?? '', {
    enabled: Boolean(packingListId),
  });
  const flowQuery = useBusinessFlowConfig(FLOW_NAME);
  const transactionsQuery = usePackageTransactions({
    packingListId: packingListId ?? undefined,
    page: 1,
    itemsPerPage: 1000,
    order: { createdAt: 'DESC' },
  });
  const createTransaction = useCreatePackageTransaction();

  const [expandedTransactionIds, setExpandedTransactionIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [isCheckingDeliveryReadiness, setIsCheckingDeliveryReadiness] = React.useState(false);

  const packingList = packingListQuery.data;
  const flow = flowQuery.data;

  const transactions = React.useMemo(
    () =>
      (transactionsQuery.data?.results ?? [])
        .slice()
        .sort((a, b) => {
          const at = new Date(a.createdAt).getTime();
          const bt = new Date(b.createdAt).getTime();
          if (Number.isNaN(at) || Number.isNaN(bt)) return 0;
          return bt - at;
        }),
    [transactionsQuery.data?.results],
  );

  const transactionIds = React.useMemo(
    () => transactions.map((transaction) => transaction.id),
    [transactions],
  );
  const hasExistingTransaction = transactions.length > 0;

  React.useEffect(() => {
    if (!packingListId) {
      setExpandedTransactionIds(new Set());
      return;
    }

    setExpandedTransactionIds(new Set(transactionIds));
  }, [packingListId, transactionIds]);

  const meta = {
    hblCode: packingList?.hblData?.hblCode ?? null,
    forwarderName: packingList?.hblData?.forwarderName ?? null,
    containerNumber: packingList?.hblData?.containerNumber ?? null,
    vessel: packingList?.hblData?.vessel ?? null,
    voyage: packingList?.hblData?.voyage ?? null,
    workingStatus: (packingList?.workingStatus ?? null) as PackingListWorkingStatus | null,
    note: packingList?.note ?? null,
  };

  const handleCreateTransaction = React.useCallback(async () => {
    if (!canWriteDelivery) {
      toast.error('You do not have permission to modify cargo package delivery.');
      return;
    }

    if (isCheckingDeliveryReadiness) {
      return;
    }

    if (!packingListId) {
      toast.warning('Please select a packing list first.');
      return;
    }

    if (hasExistingTransaction) {
      toast.warning('A delivery transaction already exists for this packing list.');
      return;
    }

    const hblId = packingList?.hblData?.id;
    if (!hblId) {
      toast.warning('Unable to verify HBL destuff status for this packing list.');
      return;
    }

    setIsCheckingDeliveryReadiness(true);

    try {
      const response = await getHBL(hblId);
      const status = response?.data?.destuffStatus;
      const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : '';

      if (normalizedStatus !== 'DONE') {
        toast.warning('HBL destuffing is not done yet.');
        return;
      }

      const { results: packages } = await fetchCargoPackagesByPackingList({
        packingListId,
        itemsPerPage: 1000,
      });

      if (packages.length === 0) {
        toast.warning('No cargo packages found for this packing list.');
        return;
      }

      const notReadyPackages = packages.filter((pkg) => {
        const isStored = String(pkg.positionStatus ?? '').toUpperCase() === 'STORED';
        const hasLocation =
          Array.isArray(pkg.currentLocationId) &&
          pkg.currentLocationId.some((locationId) => locationId.trim().length > 0);
        return !isStored || !hasLocation;
      });

      if (notReadyPackages.length > 0) {
        toast.warning(
          `${notReadyPackages.length} package(s) are not fully stored yet. Complete storage before creating delivery transaction.`,
        );
        return;
      }

      setCreateModalOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to validate delivery readiness';
      toast.error(message);
    } finally {
      setIsCheckingDeliveryReadiness(false);
    }
  }, [
    canWriteDelivery,
    hasExistingTransaction,
    isCheckingDeliveryReadiness,
    packingList?.hblData?.id,
    packingListId,
    toast,
  ]);

  if (!packingListId) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium">Select a Packing List</p>
          <p className="mt-1 text-sm">
            Choose a packing list from the left to view or create transactions.
          </p>
        </div>
      </div>
    );
  }

  if (packingListQuery.isLoading || flowQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (packingListQuery.isError) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
          <p className="text-sm font-semibold">Unable to load packing list</p>
          <p className="mt-1 text-sm opacity-90">
            {(packingListQuery.error as Error | undefined)?.message ??
              'Failed to load packing list'}
          </p>
        </div>
      </div>
    );
  }

  if (flowQuery.isError) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
          <p className="text-sm font-semibold">Unable to load flow configuration</p>
          <p className="mt-1 text-sm opacity-90">
            {(flowQuery.error as Error | undefined)?.message ?? 'Failed to load flow configuration'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Packing list transactions
            </p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {packingList?.packingListNumber ?? '—'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              HBL: {packingList?.hblData?.hblCode ?? '—'} • Container:{' '}
              {packingList?.hblData?.containerNumber ?? '—'} • Order:{' '}
              {bookingOrderCode ?? '—'} • Direction:{' '}
              <span className="font-semibold">{flow?.direction?.toUpperCase?.() ?? '—'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => transactionsQuery.refetch()}
              disabled={transactionsQuery.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${transactionsQuery.isFetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTransaction}
              loading={isCheckingDeliveryReadiness}
              disabled={hasExistingTransaction || !canWriteDelivery || isCheckingDeliveryReadiness}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Transaction
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {transactionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : transactionsQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
            <p className="text-sm font-semibold">Unable to load transactions</p>
            <p className="mt-1 text-sm opacity-90">
              {(transactionsQuery.error as Error | undefined)?.message ??
                'Failed to load transactions'}
            </p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              No transactions yet
            </p>
            <p className="mt-1 text-sm">
              Create a transaction to start the warehouse delivery flow.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <TransactionFlowAccordionItem
                key={transaction.id}
                flowName={FLOW_NAME}
                packingListId={packingListId}
                packingListNumber={packingList?.packingListNumber ?? null}
                packingListMeta={meta}
                transaction={transaction}
                direction={flow?.direction}
                steps={flow?.steps ?? []}
                expanded={expandedTransactionIds.has(transaction.id)}
                onToggle={() =>
                  setExpandedTransactionIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(transaction.id)) {
                      next.delete(transaction.id);
                    } else {
                      next.add(transaction.id);
                    }
                    return next;
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      <CreateTransactionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={async (values) => {
          if (!canWriteDelivery) {
            toast.error('You do not have permission to modify cargo package delivery.');
            return;
          }
          const payload: CreatePackageTransactionPayload = {
            packingListId,
            businessProcessFlow: FLOW_NAME,
            partyName: values.partyName,
            partyType: values.partyType,
          };

          const created = await createTransaction.mutateAsync(payload);
          setCreateModalOpen(false);
          setExpandedTransactionIds((prev) => {
            const next = new Set(prev);
            next.add(created.id);
            return next;
          });
          await transactionsQuery.refetch();
        }}
      />
    </div>
  );
};
