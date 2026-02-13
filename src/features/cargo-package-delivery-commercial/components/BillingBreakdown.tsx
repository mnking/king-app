import React from 'react';
import type { HblBillingCalculationResponse, BillingLineItem } from '../types';
import { formatCurrency } from '../utils';
import { Loader2 } from 'lucide-react';

type Props = {
  result?: HblBillingCalculationResponse;
  loading: boolean;
  error?: string | null;
};

const BreakdownRow: React.FC<{ label: string; description: string; unitPrice?: number; amount?: number; showAmount?: boolean }> = ({
  label,
  description,
  unitPrice,
  amount,
  showAmount = true,
}) => (
  <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-gray-700 dark:text-gray-200">{description}</p>
    </div>
    {showAmount ? (
      <div>
        <p className="text-gray-700 dark:text-gray-200">Unit price: {formatCurrency(unitPrice)}</p>
        <div className="text-right font-semibold text-gray-900 dark:text-gray-100">
          Amount: {formatCurrency(amount)}
        </div>
      </div>
    ) : null}
  </div>
);

const renderStorageRows = (item: BillingLineItem) =>
  item.storageBreakdown.length
    ? item.storageBreakdown.map((row, idx) => (
        <BreakdownRow
          key={`storage-${idx}`}
          label="Storage"
          description={`Days ${row.startDay}-${row.endDay} · ${row.days} day(s) · ${row.rt} RT`}
          unitPrice={row.unitPrice}
          amount={row.amount}
        />
      ))
    : [<BreakdownRow key="storage-none" label="Storage" description="No storage charges" amount={0} />];

const renderHandlingRows = (item: BillingLineItem) =>
  item.handlingBreakdown.length
    ? item.handlingBreakdown.map((row, idx) => (
        <BreakdownRow
          key={`handling-${idx}`}
          label="Handling"
          description={`${row.direction} · ${row.rt} RT`}
          unitPrice={row.unitPrice}
          amount={row.amount}
        />
      ))
    : [
        <BreakdownRow
          key="handling-none"
          label="Handling"
          description="No handling charges"
          showAmount={false}
        />,
      ];

const renderVasRows = (item: BillingLineItem) =>
  item.vasBreakdown.length
    ? item.vasBreakdown.map((row, idx) => (
        <BreakdownRow
          key={`vas-${idx}`}
          label="VAS"
          description={`${row.code} · ${row.quantity} unit(s) @ ${row.unitPrice} (${row.unit})`}
          unitPrice={row.unitPrice}
          amount={row.amount}
        />
      ))
    : [<BreakdownRow key="vas-none" label="VAS" description="No VAS charges" amount={0} />];

export const BillingBreakdown: React.FC<Props> = ({ result, loading, error }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        Calculating price...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-100">
        {error}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        No calculation yet. Click &ldquo;Calculate Price&rdquo; to fetch charges.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Totals (VND)
          </p>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Storage {formatCurrency(result.storageTotal)} · Handling {formatCurrency(result.handlingTotal)} · VAS {formatCurrency(result.vasTotal)}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {formatCurrency(result.totalAmount)}
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {result.lineItems.map((item, idx) => (
          <div key={idx} className="space-y-2 py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-700 dark:text-gray-200">Line {idx + 1}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                RT {item.rt} · Storage {formatCurrency(item.storageTotal)} · Handling {formatCurrency(item.handlingTotal)} · VAS {formatCurrency(item.vasTotal)}
              </div>
            </div>
            <div className="space-y-2">
              {renderStorageRows(item)}
              {renderHandlingRows(item)}
              {renderVasRows(item)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillingBreakdown;
