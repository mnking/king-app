import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Check,
  Plus,
  RefreshCw,
  FileCheck,
  Package,
  PackageCheck,
  ClipboardCheck,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/hooks';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import { exportPlansApi } from '@/services/apiExportPlans';
import { formatDate } from '@/shared/utils/date-format';
import { usePackingList } from '@/features/packing-list';
import type {
  DocumentFileInfo,
  ExportOrder,
  ExportPlan,
  ExportPlanContainer,
  ExportPlanPackingList,
} from '@/features/stuffing-planning';
import { exportPlanQueryKeys } from '@/features/stuffing-planning';
import type { StuffingPackageTransaction } from '@/features/stuffing-execution/types';

import { useStuffingFlowConfig } from '../hooks/use-stuffing-flow-config';
import { isSealEligible } from '../utils/seal-eligibility';
import { SealContainerModal } from './SealContainerModal';
import { StuffingTransactionPanel } from './StuffingTransactionPanel';

interface StuffingContainerDetailProps {
  flowName: string;
  plan: ExportPlan | null;
  container: ExportPlanContainer | null;
  exportOrder: ExportOrder | null;
}

type TransactionListResponse = {
  results: StuffingPackageTransaction[];
  total: number;
};

const getPackingListsForContainer = (
  plan: ExportPlan | null,
  containerId: string | null,
): ExportPlanPackingList[] => {
  if (!plan || !containerId) return [];
  return (plan.packingLists ?? []).filter(
    (packingList) => packingList.planContainerId === containerId,
  );
};

const normalizeTransactions = (transactions: StuffingPackageTransaction[]) => {
  const sorted = [...transactions].sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    return Number.isNaN(at) || Number.isNaN(bt) ? 0 : bt - at;
  });
  return sorted;
};

export const StuffingContainerDetail = ({
  flowName,
  plan,
  container,
  exportOrder,
}: StuffingContainerDetailProps) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [expandedPackingListId, setExpandedPackingListId] = useState<string | null>(
    null,
  );
  const [sealModalOpen, setSealModalOpen] = useState(false);

  const packingLists = useMemo(
    () => getPackingListsForContainer(plan, container?.id ?? null),
    [plan, container?.id],
  );

  useEffect(() => {
    if (!expandedPackingListId) return;
    const exists = packingLists.some(
      (packingList) => packingList.packingListId === expandedPackingListId,
    );
    if (!exists) {
      setExpandedPackingListId(null);
    }
  }, [expandedPackingListId, packingLists]);

  const flowQuery = useStuffingFlowConfig(flowName);
  const flowSteps = flowQuery.data?.steps ?? [];
  const stuffingStep = flowSteps.find((step) => String(step.code) === 'stuffing') ?? null;
  const inspectStep = flowSteps.find((step) => String(step.code) === 'inspect') ?? null;
  const stuffingToStatus =
    typeof stuffingStep?.toStatus === 'string' ? stuffingStep.toStatus : 'IN_CONTAINER';
  const inspectToStatus =
    typeof inspectStep?.toStatus === 'string' ? inspectStep.toStatus : null;

  const transactionQueries = useQueries({
    queries: packingLists.map((packingList) => ({
      queryKey: ['stuffing-execution', 'transactions', packingList.packingListId],
      queryFn: async (): Promise<TransactionListResponse> => {
        const response = await packageTransactionsApi.getAll({
          packingListId: packingList.packingListId ?? undefined,
          businessProcessFlow: 'stuffingWarehouse',
          itemsPerPage: 1000,
          page: 1,
          order: { createdAt: 'DESC' },
        });
        const payload =
          (response as { data?: TransactionListResponse }).data ??
          (response as unknown as TransactionListResponse);
        return payload ?? { results: [], total: 0 };
      },
      enabled: Boolean(packingList.packingListId),
      staleTime: 0,
      gcTime: 0,
      retry: 1,
    })),
  });

  const transactionsByPackingListId = useMemo(() => {
    const map: Record<string, StuffingPackageTransaction[]> = {};
    packingLists.forEach((packingList, index) => {
      const key = packingList.packingListId ?? '';
      const data = transactionQueries[index]?.data?.results ?? [];
      if (key) {
        map[key] = normalizeTransactions(data);
      }
    });
    return map;
  }, [packingLists, transactionQueries]);

  const transactionsLoading = transactionQueries.some((query) => query.isLoading);
  const canSealContainer = !transactionsLoading && isSealEligible({
    containerStatus: container?.status ?? null,
    packingListIds: packingLists
      .map((packingList) => packingList.packingListId ?? '')
      .filter(Boolean),
    transactionsByPackingListId,
  });

  const sealMutation = useMutation({
    mutationFn: async (payload: {
      sealNumber: string;
      stuffingDocument: DocumentFileInfo;
      stuffingPhoto?: DocumentFileInfo | null;
      stuffingNote?: string | null;
    }) => {
      if (!plan || !container) {
        throw new Error('Missing plan or container');
      }
      const response = await exportPlansApi.sealContainer(plan.id, container.id, payload);
      return response;
    },
    onSuccess: () => {
      toast.success('Container sealed.');
      if (plan?.id) {
        queryClient.invalidateQueries({ queryKey: exportPlanQueryKeys.detail(plan.id) });
      }
      queryClient.invalidateQueries({ queryKey: exportPlanQueryKeys.lists() });
      setSealModalOpen(false);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to seal container';
      toast.error(message);
    },
  });

  if (!plan || !container) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Select a container
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Choose a container from the left panel to view details.
          </p>
        </div>
      </div>
    );
  }

  const containerLabel = container.containerNumber ?? '—';

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Container
                </p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {containerLabel}
                </h2>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Plan: <span className="font-semibold text-gray-900 dark:text-gray-100">{plan.code ?? plan.id}</span>
              <span className="mx-2">•</span>
              Status: <span className="font-semibold text-gray-900 dark:text-gray-100">{container.status}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Forwarder: <span className="font-medium text-gray-700 dark:text-gray-200">{exportOrder?.forwarderCode ?? '—'}</span>
              <span className="mx-2">•</span>
              ETD: <span className="font-medium text-gray-700 dark:text-gray-200">{exportOrder?.bookingConfirmation?.etd ? formatDate(exportOrder.bookingConfirmation.etd) : '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => setSealModalOpen(true)}
              disabled={!canSealContainer || sealMutation.isPending}
              title={
                canSealContainer
                  ? 'Seal container'
                  : 'Seal is available when all packing lists are completed'
              }
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Seal container
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Packing Lists ({packingLists.length})
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select a packing list to start or resume stuffing.
          </p>
        </div>

        {flowQuery.isLoading ? (
          <div className="flex items-center justify-center p-6">
            <LoadingSpinner />
          </div>
        ) : flowQuery.isError ? (
          <div className="m-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
            {(flowQuery.error as Error | undefined)?.message ??
              'Unable to load flow configuration.'}
          </div>
        ) : packingLists.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
            No packing lists assigned to this container.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {packingLists.map((packingList) => (
              <PackingListRow
                key={packingList.id}
                packingList={packingList}
                transactions={
                  packingList.packingListId
                    ? transactionsByPackingListId[packingList.packingListId] ?? []
                    : []
                }
                containerStatus={container?.status ?? null}
                inspectToStatus={inspectToStatus}
                stuffingToStatus={stuffingToStatus}
                flowSteps={flowSteps}
                isExpanded={packingList.packingListId === expandedPackingListId}
                onToggle={(id) =>
                  setExpandedPackingListId((prev) => (prev === id ? null : id))
                }
                onRefreshTransactions={() => {
                  const index = packingLists.findIndex(
                    (item) => item.packingListId === packingList.packingListId,
                  );
                  if (index >= 0) {
                    void transactionQueries[index]?.refetch?.();
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <SealContainerModal
        open={sealModalOpen}
        containerNumber={containerLabel}
        ownerId={container.id}
        onClose={() => setSealModalOpen(false)}
        onSubmit={async (payload) => {
          await sealMutation.mutateAsync(payload);
        }}
        isSubmitting={sealMutation.isPending}
      />
    </div>
  );
};

const formatCount = (value?: number | null) =>
  typeof value === 'number' ? value.toString() : '—';

const PackingListRow = ({
  packingList,
  transactions,
  containerStatus,
  inspectToStatus,
  stuffingToStatus,
  flowSteps,
  isExpanded,
  onToggle,
  onRefreshTransactions,
}: {
  packingList: ExportPlanPackingList;
  transactions: StuffingPackageTransaction[];
  containerStatus: string | null;
  inspectToStatus: string | null;
  stuffingToStatus: string;
  flowSteps: BusinessFlowStep[];
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onRefreshTransactions: () => void;
}) => {
  const toast = useToast();
  const packingListDetailQuery = usePackingList(packingList.packingListId ?? '', {
    enabled: Boolean(packingList.packingListId),
  });
  const cargoFinalStatus = packingListDetailQuery.data?.cargoFinalStatus ?? 'UNKNOWN';
  const isPackingListInContainer = cargoFinalStatus === 'IN_CONTAINER';
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(
    null,
  );
  const [didAutoExpand, setDidAutoExpand] = useState(false);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isExpanded) {
      setExpandedTransactionId(null);
      setDidAutoExpand(false);
      setPendingTransactionId(null);
    }
  }, [isExpanded, packingList.packingListId]);

  const activeTransaction =
    transactions.find((transaction) => transaction.status === 'IN_PROGRESS') ??
    transactions[0] ??
    null;
  const inProgressTransactionId =
    transactions.find((transaction) => transaction.status === 'IN_PROGRESS')?.id ?? null;
  const totalFromDetail = packingListDetailQuery.data?.numberOfPackages ?? null;
  const totalFromTransaction = activeTransaction?.packages?.length ?? null;
  const packageTotal = totalFromDetail ?? totalFromTransaction;
  const packageStats = useMemo(() => {
    const statusByPackage = new Map<string, string>();

    transactions.forEach((transaction) => {
      (transaction.packages ?? []).forEach((pkg) => {
        const key = pkg.id ?? pkg.packageNo ?? null;
        if (!key) return;
        if (!statusByPackage.has(key)) {
          statusByPackage.set(key, String(pkg.positionStatus ?? ''));
        }
      });
    });

    let checked = 0;
    let stuffed = 0;
    statusByPackage.forEach((status) => {
      if (inspectToStatus && status === inspectToStatus) {
        checked += 1;
      }
      if (stuffingToStatus && status === stuffingToStatus) {
        stuffed += 1;
      }
    });

    return { checked, stuffed };
  }, [inspectToStatus, stuffingToStatus, transactions]);

  const isContainerStuffed = containerStatus === 'STUFFED';
  const canSelect = Boolean(packingList.packingListId);
  const transactionsCount = transactions.length;
  const hasInProgressTransaction = transactions.some(
    (transaction) => transaction.status === 'IN_PROGRESS',
  );
  const canCreateTransaction =
    Boolean(packingList.packingListId) &&
    !hasInProgressTransaction &&
    !isContainerStuffed &&
    !isPackingListInContainer &&
    (packageTotal === null || packageStats.stuffed !== packageTotal);
  const createButtonTitle = canCreateTransaction
    ? 'Create transaction'
    : isContainerStuffed
      ? 'Container is already stuffed'
      : isPackingListInContainer
        ? 'Packing list is already in container'
        : packageTotal !== null && packageStats.stuffed === packageTotal
          ? 'All packages are already stuffed'
        : 'A transaction is already in progress';
  const refreshButtonTitle = 'Refresh packing list and transactions';

  useEffect(() => {
    if (!isExpanded) return;
    if (!didAutoExpand && inProgressTransactionId) {
      setExpandedTransactionId(inProgressTransactionId);
      setDidAutoExpand(true);
    }
  }, [didAutoExpand, inProgressTransactionId, isExpanded]);

  useEffect(() => {
    if (!isExpanded || !expandedTransactionId) return;
    const exists = transactions.some((transaction) => transaction.id === expandedTransactionId);
    if (exists && pendingTransactionId === expandedTransactionId) {
      setPendingTransactionId(null);
    }
    if (!exists) {
      if (pendingTransactionId === expandedTransactionId) return;
      setExpandedTransactionId(inProgressTransactionId ?? null);
    }
  }, [
    expandedTransactionId,
    inProgressTransactionId,
    isExpanded,
    pendingTransactionId,
    transactions,
  ]);

  const handleRefresh = () => {
    if (packingList.packingListId) {
      void packingListDetailQuery.refetch();
    }
    onRefreshTransactions();
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!packingList.packingListId) {
        throw new Error('Missing packing list');
      }
      const response = await packageTransactionsApi.create({
        businessProcessFlow: 'stuffingWarehouse',
        packingListId: packingList.packingListId,
      });
      return response.data;
    },
    onSuccess: (created) => {
      onRefreshTransactions();
      if (created?.id) {
        setPendingTransactionId(created.id);
        setExpandedTransactionId(created.id);
        setDidAutoExpand(true);
      }
      toast.success('Transaction created');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create transaction';
      toast.error(message);
    },
  });

  return (
    <div
      className={`flex flex-col gap-3 px-6 py-4 transition ${
        isExpanded ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''
      } ${canSelect ? '' : 'opacity-60'}`}
    >
      <div
        role="button"
        tabIndex={canSelect ? 0 : -1}
        aria-expanded={isExpanded}
        aria-disabled={!canSelect}
        onClick={() => {
          if (!canSelect || !packingList.packingListId) return;
          onToggle(packingList.packingListId);
        }}
        onKeyDown={(event) => {
          if (!canSelect || !packingList.packingListId) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle(packingList.packingListId);
          }
        }}
        className="flex flex-wrap items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <div className="flex items-start gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Packing List:{' '}
              {packingList.packingListNumber ?? packingList.packingListId ?? '—'}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Status:</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  cargoFinalStatus === 'IN_CONTAINER'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                    : cargoFinalStatus === 'STORED'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
                      : cargoFinalStatus === 'CHECKOUT'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {cargoFinalStatus.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Transactions: {transactionsCount}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              if (!isExpanded && packingList.packingListId) {
                onToggle(packingList.packingListId);
              }
              createMutation.mutate();
            }}
            disabled={!canCreateTransaction}
            loading={createMutation.isPending}
            title={createButtonTitle}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create transaction
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              handleRefresh();
            }}
            title={refreshButtonTitle}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {isExpanded ? (
            <ChevronDown className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            {
              label: 'Total packages',
              value: formatCount(packageTotal),
              icon: Package,
              tone: 'text-slate-700 bg-slate-100 dark:text-slate-100 dark:bg-slate-800',
            },
            {
              label: 'Checked packages',
              value: formatCount(
                inspectToStatus ? packageStats.checked : null,
              ),
              icon: PackageCheck,
              tone: 'text-indigo-700 bg-indigo-100 dark:text-indigo-200 dark:bg-indigo-900/40',
            },
            {
              label: 'Stuffed packages',
              value: formatCount(packageStats.stuffed),
              icon: PackageCheck,
              tone: 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/40',
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-950"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.tone}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </span>
                  <span className="mx-2 text-gray-300 dark:text-gray-700">•</span>
                  <span className="text-base">{stat.value}</span>
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
          Cargo type: —
        </p>
      </div>

      {isExpanded && packingList.packingListId ? (
        <div className="space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          {transactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                No stuffing transactions yet
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Create a transaction to start the stuffing flow.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  packingListId={packingList.packingListId}
                  transaction={transaction}
                  flowSteps={flowSteps}
                  isExpanded={expandedTransactionId === transaction.id}
                  onToggle={() =>
                    setExpandedTransactionId((prev) =>
                      prev === transaction.id ? null : transaction.id,
                    )
                  }
                  totalPackages={packageTotal}
                  stuffedPackages={packageStats.stuffed}
                  onRefreshTransactions={onRefreshTransactions}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

const TransactionRow = ({
  packingListId,
  transaction,
  flowSteps,
  isExpanded,
  onToggle,
  totalPackages,
  stuffedPackages,
  onRefreshTransactions,
}: {
  packingListId: string;
  transaction: StuffingPackageTransaction;
  flowSteps: BusinessFlowStep[];
  isExpanded: boolean;
  onToggle: () => void;
  totalPackages: number | null;
  stuffedPackages: number;
  onRefreshTransactions: () => void;
}) => {
  const toast = useToast();
  const transactionDetailQuery = useQuery({
    queryKey: ['stuffing-execution', 'transaction-detail', transaction.id],
    queryFn: async (): Promise<StuffingPackageTransaction> => {
      const response = await packageTransactionsApi.getById(transaction.id);
      return response.data;
    },
    enabled: isExpanded,
  });
  const transactionDetail = transactionDetailQuery.data ?? transaction;
  const effectiveStatus = transactionDetail?.status ?? transaction.status ?? null;
  const isReadOnly = effectiveStatus !== 'IN_PROGRESS';
  const canComplete =
    !isReadOnly &&
    totalPackages !== null &&
    stuffedPackages === totalPackages;

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await packageTransactionsApi.complete(transaction.id);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Transaction completed.');
      onRefreshTransactions();
      if (isExpanded) {
        void transactionDetailQuery.refetch();
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to complete transaction';
      toast.error(message);
    },
  });

  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <span className="font-semibold text-gray-800 dark:text-gray-100">
          Transaction: {transaction.code ?? '—'}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {transaction.status.replace('_', ' ')}
          </span>
          {isExpanded ? (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={(event) => {
                event.stopPropagation();
                completeMutation.mutate();
              }}
              disabled={!canComplete}
              loading={completeMutation.isPending}
              title={canComplete ? 'Complete PL' : 'Complete when all packages are stuffed'}
            >
              <Check className="mr-2 h-4 w-4" />
              Complete PL
            </Button>
          ) : null}
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            <span>Created: {formatDate(transaction.createdAt)}</span>
            <span>Packages: {transaction.packages?.length ?? 0}</span>
            {transaction.endedAt ? (
              <span>Ended: {formatDate(transaction.endedAt)}</span>
            ) : null}
          </div>
          <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
            <StuffingTransactionPanel
              packingListId={packingListId}
              flowSteps={flowSteps}
              transaction={transactionDetail}
              readOnly={isReadOnly}
              onRefreshTransactions={onRefreshTransactions}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StuffingContainerDetail;
