import React from 'react';
import { AlertTriangle, PackagePlus, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CargoCreateStep } from '@/shared/features/cargo-create-step';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { Button } from '@/shared/components/ui/Button';
import { useToast } from '@/shared/hooks';
import { packingListsApi } from '@/services/apiPackingLists';
import { packageTransactionsApi } from '@/services/apiPackageTransactions';
import type { PackingListListItem } from '@/features/packing-list/types';
import type { PackageTransaction } from '@/features/cfs-cargo-package-delivery/types/package-transaction-types';

const badgeTone: Record<string, string> = {
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60',
  DONE: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60',
  DEFAULT: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
};

const normalizePackingListResults = (
  payload: unknown,
): PackingListListItem[] => {
  if (!payload || typeof payload !== 'object') return [];
  const maybeData = 'data' in payload ? (payload as { data?: unknown }).data : payload;
  if (!maybeData || typeof maybeData !== 'object') return [];
  const results = (maybeData as { results?: PackingListListItem[] }).results;
  return Array.isArray(results) ? results : [];
};

const normalizeTransactionResults = (
  payload: unknown,
): PackageTransaction[] => {
  if (!payload || typeof payload !== 'object') return [];
  const maybeData = 'data' in payload ? (payload as { data?: unknown }).data : payload;
  if (!maybeData || typeof maybeData !== 'object') return [];
  const results = (maybeData as { results?: PackageTransaction[] }).results;
  return Array.isArray(results) ? results : [];
};

const ExportCargoReceivingStepPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedPackingListId, setSelectedPackingListId] = React.useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<string | null>(null);

  const packingListsQuery = useQuery({
    queryKey: ['export-cargo-receiving', 'packing-lists'],
    queryFn: async () => {
      const response = await packingListsApi.getAll({
        page: 1,
        itemsPerPage: 100,
        directionFlow: 'EXPORT',
        workingStatus: ['INITIALIZED', 'IN_PROGRESS'],
      });
      return normalizePackingListResults(response);
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const packingLists = React.useMemo(
    () => packingListsQuery.data ?? [],
    [packingListsQuery.data],
  );

  React.useEffect(() => {
    if (!selectedPackingListId && packingLists.length > 0) {
      setSelectedPackingListId(packingLists[0].id);
    }
  }, [packingLists, selectedPackingListId]);

  React.useEffect(() => {
    setSelectedTransactionId(null);
  }, [selectedPackingListId]);

  const transactionsQuery = useQuery({
    queryKey: ['export-cargo-receiving', 'transactions', selectedPackingListId],
    queryFn: async () => {
      const response = await packageTransactionsApi.getAll({
        packingListId: selectedPackingListId ?? undefined,
        itemsPerPage: 100,
        page: 1,
      });
      return normalizeTransactionResults(response);
    },
    enabled: Boolean(selectedPackingListId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const transactions = React.useMemo(
    () => transactionsQuery.data ?? [],
    [transactionsQuery.data],
  );
  const selectedPackingList = React.useMemo(
    () => packingLists.find((pl) => pl.id === selectedPackingListId) ?? null,
    [packingLists, selectedPackingListId],
  );

  const inProgressTransaction = transactions.find((tx) => tx.status === 'IN_PROGRESS') ?? null;
  const hasInProgress = Boolean(inProgressTransaction);

  React.useEffect(() => {
    if (!transactions.length) {
      setSelectedTransactionId(null);
      return;
    }

    const current = transactions.find((tx) => tx.id === selectedTransactionId);
    if (current && current.status === 'IN_PROGRESS') return;

    if (inProgressTransaction) {
      setSelectedTransactionId(inProgressTransaction.id);
      return;
    }

    setSelectedTransactionId(null);
  }, [inProgressTransaction, selectedTransactionId, transactions]);

  const createTransaction = useMutation({
    mutationFn: async () => {
      if (!selectedPackingListId) throw new Error('Select a packing list first');
      const response = await packageTransactionsApi.create({
        packingListId: selectedPackingListId,
        businessProcessFlow: 'destuffWarehouse',
      });
      return response.data;
    },
    onSuccess: (created) => {
      toast.success('Transaction created');
      queryClient.invalidateQueries({ queryKey: ['export-cargo-receiving', 'transactions', selectedPackingListId] });
      setSelectedTransactionId(created.id);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create transaction');
    },
  });

  const selectedTransaction = transactions.find((tx) => tx.id === selectedTransactionId) ?? null;

  const plNumber = selectedPackingList?.packingListNumber ?? selectedPackingList?.id ?? '';
  const hblCode = selectedPackingList?.hblData?.hblCode ?? null;
  const status = selectedPackingList?.workingStatus ?? 'IN_PROGRESS';
  const statusClass = badgeTone[status] ?? badgeTone.DEFAULT;
  const containerNumber = selectedPackingList?.hblData?.containerNumber ?? null;
  const directionFlow = selectedPackingList?.directionFlow ?? null;

  const renderHeader = () => {
    if (packingListsQuery.isLoading) {
      return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
          <LoadingSpinner />
          Loading packing lists...
        </div>
      );
    }

    if (packingListsQuery.isError) {
      const message = (packingListsQuery.error as Error | undefined)?.message ?? 'Failed to load packing lists';
      return (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-800 shadow-sm dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-2">
            <div className="font-semibold">Could not load packing lists</div>
            <div>{message}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void packingListsQuery.refetch()}
              className="inline-flex items-center gap-2 border-slate-300 bg-white text-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (!packingLists.length) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
          No packing lists found.
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="mb-1 flex items-center gap-2 text-blue-600">
              <span className="flex h-2 w-2 rounded-full bg-blue-600" />
              <p className="text-xs font-bold uppercase tracking-wider">Development Preview</p>
            </div>
            <div className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Export - Cargo Package Receiving Page
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Select a packing list, manage its transactions, and record received cargo packages.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <PackagePlus className="h-4 w-4" />
            <span>Step: create</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            Select Packing List
            <select
              value={selectedPackingListId ?? ''}
              onChange={(e) => setSelectedPackingListId(e.target.value || null)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {packingLists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.packingListNumber ?? pl.id} {pl.hblData?.hblCode ? `• HBL ${pl.hblData.hblCode}` : ''}
                </option>
              ))}
            </select>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                  {status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-700 dark:text-slate-200">PL</span>
                <span className="text-right text-slate-900 dark:text-slate-100">{plNumber || '—'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">HBL</span>
                <span className="text-right text-slate-900 dark:text-slate-100">{hblCode ?? '—'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Container</span>
                <span className="text-right text-slate-900 dark:text-slate-100">{containerNumber ?? '—'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Direction</span>
                <span className="text-right text-slate-900 dark:text-slate-100">{directionFlow ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <div>
              <div className="text-base font-semibold">Transactions</div>
              <p className="text-xs font-normal text-slate-500">Select an IN_PROGRESS transaction.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={createTransaction.isPending}
              disabled={!selectedPackingListId || hasInProgress}
              onClick={() => createTransaction.mutate()}
            >
              Create
            </Button>
          </div>

          <div className="space-y-3 p-4">
            {transactionsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <LoadingSpinner />
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                No transactions yet. Create the first one to start receiving packages.
              </div>
            ) : (
              transactions.map((tx) => {
                const statusClass = badgeTone[tx.status] ?? badgeTone.DEFAULT;
                const isDone = tx.status === 'DONE';
                const isSelected = tx.id === selectedTransactionId;

                return (
                  <button
                    key={tx.id}
                    type="button"
                    disabled={isDone}
                    onClick={() => setSelectedTransactionId(tx.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${isSelected
                        ? 'border-blue-400 bg-blue-50/80 shadow-sm dark:border-blue-500/60 dark:bg-blue-900/30'
                        : 'border-slate-200 bg-white/70 hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900/50'
                      } ${isDone ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {tx.code || 'Transaction'}
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {tx.createdAt ? `Created ${new Date(tx.createdAt).toLocaleString()}` : 'Created time unknown'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {renderHeader()}

      {selectedPackingList ? (
        <div className="space-y-6">


          <div>
            {selectedTransaction && selectedTransaction.status === 'IN_PROGRESS' ? (
              <CargoCreateStep
                packingListId={selectedPackingList.id}
                packageTransactionId={selectedTransaction.id}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                Select an IN_PROGRESS transaction to receive packages.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ExportCargoReceivingStepPage;
