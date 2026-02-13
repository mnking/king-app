import { Package2, Calendar, Building2, ArrowRight } from 'lucide-react';
import type { DestuffingPlan } from '@/features/destuffing-execution/types';

interface InProgressPlansListProps {
  plans: DestuffingPlan[];
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
  getForwarderLabel: (planId: string) => string | null;
}

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '—';

export const InProgressPlansList = ({
  plans,
  selectedPlanId,
  onSelect,
  getForwarderLabel,
}: InProgressPlansListProps) => {
  if (!plans.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {plans.map((plan) => {
        const isSelected = plan.id === selectedPlanId;
        const isDone = plan.status === 'DONE';
        const containerCount = plan.containers?.length ?? 0;
        const forwarderLabel = getForwarderLabel(plan.id);

        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            disabled={isDone}
            className={`
              w-full px-4 py-3 text-left transition-all duration-200 group relative rounded-xl border
              ${isSelected
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
              }
              ${isDone ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            {isSelected && (
              <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-full" />
            )}

            <div className="flex items-start gap-3.5">
              <div
                className={`
                  p-2 rounded-lg shrink-0 transition-all
                  ${isSelected
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm"
                  }
                `}
              >
                <Package2 className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Header Line */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
                      {plan.code}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm">
                      {containerCount} containers
                    </span>
                  </div>
                  {isDone && (
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800">
                      Done
                    </span>
                  )}
                </div>

                {/* Forwarder Line */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[180px]">
                    {forwarderLabel ?? 'Forwarder TBD'}
                  </span>
                </div>

                {/* Date Grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
                  <div className="space-y-0.5">
                    <p className="text-xs uppercase font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" /> Start
                    </p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatDate(plan.plannedStart)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs uppercase font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <ArrowRight className="h-2.5 w-2.5" /> End
                    </p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatDate(plan.plannedEnd)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
