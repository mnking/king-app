import React from 'react';
import { Calendar, Package2, Check, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import type { DestuffingPlan } from '../types';

interface DestuffingPlanListProps {
  plans: DestuffingPlan[];
  isLoading?: boolean;
  error?: string | null;
  onViewPlan?: (plan: DestuffingPlan) => void;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 2 }).map((_, index) => (
      <div
        key={index}
        className="h-32 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
      />
    ))}
  </div>
);

const formatDateRange = (start?: string, end?: string) => {
  if (!start || !end) {
    return '—';
  }
  return `${dateFormatter.format(new Date(start))} → ${dateFormatter.format(new Date(end))}`;
};

const BooleanChip: React.FC<{ value?: boolean; label: string; trueText?: string; falseText?: string }> = ({
  value,
  label,
  trueText = 'Yes',
  falseText = 'No',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${value
      ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
      }`}
  >
    {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    {label} {value ? trueText : falseText}
  </span>
);

export const DestuffingPlanList: React.FC<DestuffingPlanListProps> = ({
  plans,
  isLoading = false,
  error,
  onViewPlan,
}) => {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Scheduled Destuffing Plans
          </h2>
          <p className="text-sm text-gray-500">
            Loading scheduled plans…
          </p>
        </div>
        <div className="mt-6">
          <LoadingSkeleton />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-900">
          Scheduled Destuffing Plans
        </h2>
        <p className="text-sm text-gray-500">
          {plans.length
            ? `${plans.length} plan${plans.length === 1 ? '' : 's'} scheduled`
            : 'No plans scheduled yet'}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!plans.length && !error ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
          No scheduled destuffing plans.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    {plan.code}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {plan.forwarderName ??
                      plan.forwarder?.name ??
                      plan.forwarder?.code ??
                      'Forwarder TBD'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Status: {plan.status ?? 'SCHEDULED'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewPlan?.(plan)}
                >
                  View
                </Button>
              </div>

              <div className="grid gap-4 text-sm text-gray-600 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Planned Window
                    </p>
                    <p className="font-medium text-gray-900">
                      {formatDateRange(plan.plannedStart, plan.plannedEnd)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Containers
                    </p>
                    <p className="font-medium text-gray-900">
                      {plan.containers?.length ?? 0}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <BooleanChip
                    label="Equipment"
                    value={plan.equipmentBooked}
                    trueText="Booked"
                    falseText="Pending"
                  />
                  <BooleanChip
                    label="Appointment"
                    value={plan.approvedAppointment ?? plan.appointmentConfirmed}
                    trueText="Confirmed"
                    falseText="Pending"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
