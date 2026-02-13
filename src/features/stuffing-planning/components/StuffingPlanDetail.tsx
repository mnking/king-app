import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardList, Boxes } from 'lucide-react';
import { formatDate, formatDateTime } from '@/shared/utils/date-format';
import { PlanAssigningTab } from './PlanAssigningTab';
import { useShippingLine } from '@/features/shipping-lines';
import type { ExportPlan } from '../types';
import { useExportOrder } from '../hooks';
import { planStatusLabel } from '../utils';

interface StuffingPlanDetailProps {
  plan: ExportPlan | null;
  isLoading?: boolean;
  error?: string | null;
}

export const StuffingPlanDetail: React.FC<StuffingPlanDetailProps> = ({
  plan,
  isLoading = false,
  error,
}) => {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const exportOrderId = plan?.exportOrderId ?? '';
  const { data: exportOrder } = useExportOrder(exportOrderId, {
    enabled: Boolean(exportOrderId),
  });
  const booking = exportOrder?.bookingConfirmation;
  const shippingLineId = booking?.shippingLine ?? '';
  const { data: shippingLine } = useShippingLine(shippingLineId);

  if (!plan) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {isLoading ? 'Loading...' : 'No plan selected'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {error || 'Select a stuffing plan to view details'}
          </p>
        </div>
      </div>
    );
  }

  const planCode = plan.code ?? plan.id;
  const shippingLineName = shippingLine?.name ?? '-';
  const planStatusText = planStatusLabel[plan.status] ?? plan.status ?? 'Created';

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed((prev) => !prev)}
              aria-expanded={!isHeaderCollapsed}
              aria-controls="stuffing-plan-header-details"
              className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${isHeaderCollapsed ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700/40'} ${isHeaderCollapsed ? '' : 'mb-4'}`}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Plan {planCode}</h2>
              <span className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${plan.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}
              `}>
                {planStatusText}
              </span>
              <span className="ml-auto inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1.5 text-gray-500">
                {isHeaderCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </span>
            </button>

            <div
              id="stuffing-plan-header-details"
              className={`flex flex-col gap-6 ${isHeaderCollapsed ? 'hidden' : ''}`}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Plan Information
                </p>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Plan Status</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {planStatusText}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Plan Code</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {plan.code ?? plan.id}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order Code</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {exportOrder?.code ?? plan.exportOrderId}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Forwarder</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {exportOrder?.forwarderCode ?? '-'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Created At</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(plan.createdAt)}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Last Updated</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(plan.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Voyage Information
                </p>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Shipping Line</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {shippingLineName}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">POL</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {booking?.pol ?? '-'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">POD</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {booking?.pod ?? '-'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vessel</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {booking?.vessel ?? '-'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Voyage</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {booking?.voyage ?? '-'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ETD</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatDate(booking?.etd ?? null)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Boxes className="h-5 w-5 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Packing List Assignment
            </h3>
          </div>
          <PlanAssigningTab plan={plan} />
        </div>
      </div>
    </div>
  );
};

export default StuffingPlanDetail;
