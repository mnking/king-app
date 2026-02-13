import React from 'react';
import { FEE_ITEMS } from '../constants';
import { formatCurrency } from '../utils';

type Props = { total: number };

export const FeeTable: React.FC<Props> = ({ total }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100">
        Cost breakdown (demo)
      </div>
      <div className="divide-y divide-gray-200 text-sm text-gray-800 dark:divide-gray-700 dark:text-gray-100">
        <div className="flex items-center justify-between bg-gray-50 px-4 py-2 text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <span>Service</span>
          <span>Cost (VND)</span>
        </div>
        {FEE_ITEMS.map((item) => (
          <div key={item.name} className="flex items-center justify-between px-4 py-3">
            <span>{item.name}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between bg-gray-50 px-4 py-3 text-base font-semibold text-blue-600 dark:bg-gray-900 dark:text-blue-400">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default FeeTable;
