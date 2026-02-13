import { Package, Clock, CheckCircle2, Building2, Hash } from 'lucide-react';
import type { DestuffingPlan } from '@/features/destuffing-execution/types';
import { ContainerList } from './ContainerList';

interface PlanDetailPanelProps {
  plan?: DestuffingPlan;
  forwarderLabel?: string | null;
  canWrite?: boolean;
}

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    : '—';

export const PlanDetailPanel = ({
  plan,
  forwarderLabel,
  canWrite = true,
}: PlanDetailPanelProps) => {
  if (!plan) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 p-12">
        <div className="text-center max-w-sm">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No plan selected
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Select a destuffing plan from the left panel to view details and manage containers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Plan Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-800">

          {/* Main Info Section */}
          <div className="p-5 lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Hash className="h-3.5 w-3.5" />
                  <span>Plan Code</span>
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    {plan.code}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    In Progress
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-gray-50/80 dark:bg-gray-800/50 p-3 border border-gray-200 dark:border-gray-800 max-w-fit">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Forwarder:</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {forwarderLabel ?? 'Unknown Forwarder'}
              </span>
            </div>
          </div>

          {/* Metrics Section */}
          <div className="p-5 bg-gray-50/30 dark:bg-gray-800/20">
            <div className="space-y-4">
              {/* Time Range */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Time Schedule
                </p>
                <div className="space-y-3">
                  <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Estimated Start</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(plan.plannedStart)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Estimated End</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(plan.plannedEnd)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Status */}
              {plan.executionStart && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Started
                    </span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {formatDate(plan.executionStart)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Container List */}
      <ContainerList plan={plan} canWrite={canWrite} />
    </div>
  );
};

