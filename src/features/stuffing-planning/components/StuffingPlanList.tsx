import React, { useState } from 'react';
import { RefreshCw, Trash2, Box, Calendar, Package } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { formatDate } from '@/shared/utils/date-format';
import type { ExportPlan } from '../types';
import { useExportOrder } from '../hooks';

interface StuffingPlanListProps {
  plans: ExportPlan[];
  selectedPlanId: string | null;
  isLoading?: boolean;
  error?: string | null;
  onSelectPlan: (planId: string) => void;
  onDeletePlan: (plan: ExportPlan) => void;
  onRefresh?: () => void;
}

const PlanSkeleton: React.FC = () => (
  <div className="space-y-1 p-2">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="h-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800"
      />
    ))}
  </div>
);

export const StuffingPlanList: React.FC<StuffingPlanListProps> = ({
  plans,
  selectedPlanId,
  isLoading = false,
  error,
  onSelectPlan,
  onDeletePlan,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Stuffing Plans</h2>
          {onRefresh && (
            <Button
              type="button"
              onClick={handleRefreshClick}
              loading={isRefreshing}
              variant="secondary"
              size="sm"
              className="gap-2"
              title="Refresh plans"
            >
              {!isRefreshing && <RefreshCw className="h-4 w-4" />}
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>
      </div>

      {/* Plan List */}
      <div className="flex flex-1 flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Active Plans ({plans.length})
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-900">
          {isLoading ? (
            <PlanSkeleton />
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 m-4 border border-red-100 dark:border-red-900/50 text-sm">
              {error}
            </div>
          ) : plans.length > 0 ? (
            <div className="border-t border-gray-100 dark:border-gray-800">
              {plans.map((plan) => (
                <PlanItem
                  key={plan.id}
                  plan={plan}
                  isSelected={plan.id === selectedPlanId}
                  onSelect={() => onSelectPlan(plan.id)}
                  onDelete={() => onDeletePlan(plan)}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="px-4 py-12 text-center">
              <Box className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No stuffing plans created</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Create a plan to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StuffingPlanList;

const PlanItem: React.FC<{
  plan: ExportPlan;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ plan, isSelected, onSelect, onDelete }) => {
  const canDelete = plan.status === 'CREATED' && (plan.containers?.length ?? 0) === 0;
  const { data: exportOrder } = useExportOrder(plan.exportOrderId, {
    enabled: Boolean(plan.exportOrderId),
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div className="relative group">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`w-full border-b border-gray-200 dark:border-gray-800 px-4 py-3 text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${canDelete ? 'pr-14' : ''} ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
            : 'border-l-4 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <div className="flex items-start gap-3 w-full">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {/* Plan Code + Status */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {plan.code}
              </h3>
              <span className={`
                inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase
                ${plan.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}
              `}>
                {plan.status === 'IN_PROGRESS' ? 'In Progress' : 'Created'}
              </span>
            </div>

            {/* Order & Date */}
            <div className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-400 mb-2">
              <span>Order: <span className="font-medium text-gray-800 dark:text-gray-200">{exportOrder?.code ?? plan.exportOrderId}</span></span>
              <span>Forwarder: <span className="font-medium text-gray-800 dark:text-gray-200">{exportOrder?.forwarderCode ?? '-'}</span></span>
              {exportOrder?.bookingConfirmation?.etd && (
                <span>ETD: {formatDate(exportOrder.bookingConfirmation.etd)}</span>
              )}
            </div>

            {/* Counts Badges */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Package className="h-3 w-3" />
                {plan.containers?.length ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Box className="h-3 w-3" />
                {plan.packingLists?.length ?? 0} PLs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Button - Absolute positioned to not interfere with main click area too much, or use z-index */}
      {canDelete && (
        <div className="absolute top-3 right-2 opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete plan"
            aria-label="Delete plan"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
