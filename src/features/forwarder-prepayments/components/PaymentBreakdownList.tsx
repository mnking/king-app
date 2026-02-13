import React from 'react';
import { formatCurrency } from '../helpers/format';
import type { BillingChargeItem } from '../types';

interface PaymentBreakdownListProps {
  title: string;
  items: BillingChargeItem[];
  emptyText: string;
}

export const PaymentBreakdownList: React.FC<PaymentBreakdownListProps> = ({
  title,
  items,
  emptyText,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-600 dark:text-gray-300">
                {item.description}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
};
