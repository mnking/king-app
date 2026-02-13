import React from 'react';
import { AlertCircle, Package, Calendar, Check, X, RefreshCw } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { formatDateTime } from '@/shared/utils/date-format';
import type { ReceivePlan } from '@/shared/features/plan/types';

interface PlanListProps {
  scheduledPlans: ReceivePlan[];
  unplannedCount: number;
  selectedUnplannedCount: number;
  selectedPlanId: string | 'unplanned' | null;
  onSelectPlan: (planId: string | 'unplanned') => void;
  onCreatePlan: () => void;
  className?: string;
  onRefresh?: () => Promise<void> | void;
  canWrite?: boolean;
}

/**
 * PlanList - Left panel showing plan list
 *
 * Display order (top to bottom):
 * 1. Unplanned (virtual plan, always first, orange highlight)
 * 2. SCHEDULED plans (sorted by plannedStart ASC)
 */
export const PlanList: React.FC<PlanListProps> = ({
  scheduledPlans,
  unplannedCount,
  selectedUnplannedCount,
  selectedPlanId,
  onSelectPlan,
  onCreatePlan,
  onRefresh,
  canWrite = true,
  className = '',
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

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
    <div className={`h-full min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Container Receive Plan</h2>
          <Button
            type="button"
            onClick={handleRefreshClick}
            disabled={!onRefresh}
            loading={isRefreshing}
            variant="secondary"
            size="sm"
            className="gap-2"
            title="Refresh receive plan data"
          >
            {!isRefreshing && <RefreshCw className="h-4 w-4" />}
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Plan List */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Unplanned Item (Always First) */}
	        <Button
	          type="button"
	          onClick={() => onSelectPlan('unplanned')}
	          variant="ghost"
	          size="md"
	          className={`
	            w-full !justify-start rounded-none px-4 py-3 border-b border-gray-200 dark:border-gray-700
	            transition-all duration-200 text-left
	            focus:ring-0 focus:ring-offset-0
	            ${selectedPlanId === 'unplanned'
	              ? 'bg-orange-100 dark:bg-orange-900/40 border-l-4 border-l-orange-500 text-orange-900 dark:text-orange-100'
	              : 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-l-4 border-l-transparent hover:border-l-orange-300 text-orange-900 dark:text-orange-100'
	            }
	          `}
	        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-200">Unplanned</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-200">
                  {unplannedCount}
                </span>
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Containers not yet assigned to a plan
              </p>
            </div>
          </div>
        </Button>

        {/* Scheduled Plans Section */}
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Scheduled Plans
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={onCreatePlan}
              disabled={!canWrite}
              className="ml-4"
            >
              <Package className="h-4 w-4 mr-2" />
              Create Plan ({selectedUnplannedCount})
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-900">
            {scheduledPlans.length > 0 ? (
              <div>
	                {scheduledPlans.map((plan) => (
	                  <Button
	                    type="button"
	                    key={plan.id}
	                    onClick={() => onSelectPlan(plan.id)}
	                    variant="ghost"
	                    size="md"
	                    className={`
	                      w-full !justify-start rounded-none px-4 py-3 border-b border-gray-200 dark:border-gray-700
	                      transition-all duration-200 text-left
	                      focus:ring-0 focus:ring-offset-0
	                      ${selectedPlanId === plan.id
	                        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500 text-gray-900 dark:text-gray-100'
	                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-l-transparent hover:border-l-blue-300 text-gray-900 dark:text-gray-100'
	                      }
	                    `}
	                  >
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {/* Plan Code + Container Count */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {plan.code}
                          </h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            <Package className="h-3.5 w-3.5" />
                            {plan.containers.length}
                          </span>
                        </div>

                        {/* Time Range */}
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {formatDateTime(plan.plannedStart)} → {formatDateTime(plan.plannedEnd)}
                        </p>

                        {/* Equipment & Port Status Badges */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`
                              inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150
                              ${plan.equipmentBooked
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                              }
                            `}
                          >
                            {plan.equipmentBooked ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                            Equipment
                          </span>
                          <span
                            className={`
                              inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150
                              ${plan.portNotified
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                              }
                            `}
                          >
                            {plan.portNotified ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                            Port
                          </span>
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="px-4 py-8 text-center">
                <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No plans created yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Select containers from Unplanned to create a plan
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
