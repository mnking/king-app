import { useEffect, useMemo, useState } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import {
  useInProgressDestuffingPlans,
  useResolvedForwarderLabels,
} from '@/features/destuffing-execution/hooks';
import { useInProgressPlan } from '@/features/destuffing-execution/hooks/use-destuffing-execution';
import { clearBookingOrderCache } from '@/features/destuffing-execution/utils/booking-order-cache';
import type { DestuffingPlan } from '@/features/destuffing-execution/types';
import { InProgressPlansList } from './InProgressPlansList';
import { PlanDetailPanel } from './PlanDetailPanel';
import { useAuth } from '@/features/auth/useAuth';

export const DestuffingExecutionWorkspace = () => {
  const { can } = useAuth();
  const canWriteActualDestuff = can?.('actual_destuff:write') ?? false;
  const {
    data: plans = [],
    isLoading,
    isError,
    refetch: refetchPlans,
    isFetching,
  } = useInProgressDestuffingPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const effectivePlanId = selectedPlanId ?? plans[0]?.id ?? null;
  const {
    data: planDetail,
    refetch: refetchPlanDetail,
    isFetching: isFetchingPlanDetail,
  } = useInProgressPlan(effectivePlanId ?? undefined, { enabled: Boolean(effectivePlanId) });

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) =>
        (a.plannedStart ?? '').localeCompare(b.plannedStart ?? ''),
      ),
    [plans],
  );

  // Resolve forwarder labels for all plans
  const { getForwarderLabel } = useResolvedForwarderLabels(sortedPlans);

  const selectedPlan: DestuffingPlan | undefined = useMemo(() => {
    if (planDetail) return planDetail;
    if (effectivePlanId) return sortedPlans.find((plan) => plan.id === effectivePlanId);
    return sortedPlans[0];
  }, [effectivePlanId, planDetail, sortedPlans]);

  useEffect(() => {
    if (!selectedPlanId && sortedPlans[0]?.id) {
      setSelectedPlanId(sortedPlans[0].id);
    }
  }, [selectedPlanId, sortedPlans]);

  const isRefreshing = isFetching || isFetchingPlanDetail;

  const handleRefresh = () => {
    clearBookingOrderCache();
    void refetchPlans();
    if (effectivePlanId) {
      void refetchPlanDetail();
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-gray-100 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 shadow-sm z-10">
        <div className="flex items-center justify-between gap-4">
          <nav className="flex gap-8 -mb-px" aria-label="Destuffing execution tabs">
            <button
              type="button"
              className="relative py-4 px-1 text-sm font-semibold text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:rounded-full focus:outline-none"
              aria-current="page"
            >
              Execution
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex text-gray-900 dark:text-gray-100">
        <div className="flex h-full min-h-0 w-full relative">
          {/* Left Sidebar - Plans List */}
          <aside className="w-full md:w-[420px] min-w-[360px] max-w-[520px] border-r border-gray-200 dark:border-gray-800 flex flex-col relative bg-white dark:bg-gray-900 min-h-0 z-0">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-900 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Destuffing Execution
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Monitor and execute operations
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60 border border-transparent hover:border-gray-200"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Plans List Header */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                In-Progress Plans
              </p>
              <span className="inline-flex items-center justify-center rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 min-w-[1.5rem] h-5 px-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                {sortedPlans.length}
              </span>
            </div>

            {/* Plans List Content */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-900">
              {isLoading ? (
                <div className="space-y-2 px-4 py-8">
                  <div className="flex flex-col items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <LoadingSpinner className="h-6 w-6 text-blue-500" />
                    <span>Loading plans...</span>
                  </div>
                </div>
              ) : isError ? (
                <div className="m-4 rounded-lg border border-red-100 bg-red-50/50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                  Failed to load in-progress plans. Please try again.
                </div>
              ) : sortedPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    No plans in progress
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px]">
                    Plans will appear here when execution starts
                  </p>
                </div>
              ) : (
                <InProgressPlansList
                  plans={sortedPlans}
                  selectedPlanId={selectedPlan?.id ?? null}
                  onSelect={setSelectedPlanId}
                  getForwarderLabel={getForwarderLabel}
                />
              )}
            </div>
          </aside>

          {/* Right Content - Plan Details */}
          <section className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-6">
            <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
              <PlanDetailPanel
                plan={selectedPlan}
                forwarderLabel={selectedPlan ? getForwarderLabel(selectedPlan.id) : null}
                canWrite={canWriteActualDestuff}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

