import React from 'react';
import { Package, PackageCheck, PackagePlus, Printer } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { useExportCargoReceivingPackageTransactions } from '../hooks';
import type { ExportCargoReceivingListItem } from '../types';
import ExportCargoReceivingTransactionModal from './ExportCargoReceivingTransactionModal';

interface ExportCargoReceivingDetailCardProps {
  item: ExportCargoReceivingListItem;
}

const formatCount = (value?: number | null) =>
  typeof value === 'number' ? value.toString() : '—';

export const ExportCargoReceivingDetailCard: React.FC<
  ExportCargoReceivingDetailCardProps
> = ({ item }) => {
  const [transactionModalOpen, setTransactionModalOpen] = React.useState(false);
  const { data: transactionsResponse } =
    useExportCargoReceivingPackageTransactions(item.id);
  const transactions = React.useMemo(
    () => transactionsResponse?.results ?? [],
    [transactionsResponse],
  );
  const latestTransaction = transactions[0] ?? null;

  const packageCounts = React.useMemo(() => {
    if (!transactionsResponse) return null;
    let received = 0;
    let checked = 0;
    let stored = 0;

    transactions.forEach((transaction) => {
      (transaction.packages ?? []).forEach((pkg) => {
        if (pkg.positionStatus === 'UNKNOWN') {
          received += 1;
        } else if (pkg.positionStatus === 'CHECK_IN') {
          checked += 1;
        } else if (pkg.positionStatus === 'STORED') {
          stored += 1;
        }
      });
    });

    return { received, checked, stored };
  }, [transactions, transactionsResponse]);

  const canPrint = latestTransaction?.status === 'DONE';

  const stats = [
    {
      label: 'Expected packages',
      value: formatCount(item.numberOfPackages ?? null),
      icon: Package,
      tone: 'text-slate-700 bg-slate-100 dark:text-slate-100 dark:bg-slate-800',
    },
    {
      label: 'Received Packages',
      value: formatCount(packageCounts?.received ?? null),
      icon: PackagePlus,
      tone: 'text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/40',
    },
    {
      label: 'Checked Packages',
      value: formatCount(packageCounts?.checked ?? null),
      icon: PackageCheck,
      tone: 'text-indigo-700 bg-indigo-100 dark:text-indigo-200 dark:bg-indigo-900/40',
    },
    {
      label: 'Stored Packages',
      value: formatCount(packageCounts?.stored ?? null),
      icon: PackageCheck,
      tone: 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/40',
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/95">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Package progress
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-2"
            onClick={() => setTransactionModalOpen(true)}
          >
            <PackagePlus className="h-4 w-4" />
            Open receiving transaction
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canPrint}
            className="gap-2"
            title={
              canPrint
                ? 'Print receiving slip'
                : 'Available after receiving is completed'
            }
          >
            <Printer className="h-4 w-4" />
            Print receiving slip
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 p-2 dark:border-slate-700/70 dark:bg-slate-800/60"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.tone}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <ExportCargoReceivingTransactionModal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        item={item}
      />
    </div>
  );
};

export default ExportCargoReceivingDetailCard;
