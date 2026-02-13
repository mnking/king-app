import { Check, X } from 'lucide-react';

export type StepStatus = 'default' | 'current' | 'completed' | 'rejected';

export interface StatusStepperStep {
  key: string;
  label: string;
  description?: string;
  status?: StepStatus;
}

export interface StatusStepperProps {
  steps: StatusStepperStep[];
  currentIndex: number;
  isRejected?: boolean;
  className?: string;
  lineInsetPercent?: number; // how far to inset the line from edges (percentage of container)
  showIndex?: boolean; // show numeric index when no icon
}

/**
 * StatusStepper
 * - Renders a horizontal stepper with a base track and progress overlay.
 * - Uses 36px circular badges with check/X icons for completed/rejected.
 */
export const StatusStepper: React.FC<StatusStepperProps> = ({
  steps,
  currentIndex,
  isRejected = false,
  className = '',
  lineInsetPercent = 6, // trims the line from edges by default
  showIndex = true,
}) => {
  if (!steps || steps.length === 0) return null;

  const safeCurrentIndex = Math.min(Math.max(currentIndex, 0), steps.length - 1);
  const connectorOffsetPct = Math.max(0, Math.min(lineInsetPercent, 25));
  const baseLineWidthPct = 100 - connectorOffsetPct * 2;
  const progressWidthPct =
    safeCurrentIndex <= 0
      ? 0
      : (safeCurrentIndex / (steps.length - 1)) * baseLineWidthPct;

  return (
    <div className={`relative mt-6 px-4 ${className}`}>
      {/* Base line */}
      <div
        className="absolute top-[18px] h-[3px] rounded-full bg-blue-100 dark:bg-slate-700"
        style={{
          left: `${connectorOffsetPct}%`,
          right: `${connectorOffsetPct}%`,
        }}
        aria-hidden
      />
      {/* Progress line */}
      <div
        className={`absolute top-[18px] h-[3px] rounded-full transition-all ${
          isRejected ? 'bg-rose-500 dark:bg-rose-600' : 'bg-blue-500 dark:bg-blue-600'
        }`}
        style={{
          left: `${connectorOffsetPct}%`,
          width: `${progressWidthPct}%`,
        }}
        aria-hidden
      />

      <div
        className="relative z-10 grid items-start gap-6"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, idx) => {
          const hasOverride = step.status !== undefined;
          const isCurrent = hasOverride
            ? step.status === 'current'
            : safeCurrentIndex === idx;
          const isCompleted = hasOverride
            ? step.status === 'completed'
            : idx < safeCurrentIndex && !isRejected;
          const showRejectedX = hasOverride
            ? step.status === 'rejected'
            : isRejected && isCurrent;
          const showCheckIcon = !showRejectedX && isCompleted;

          const circleClasses = showRejectedX
            ? 'border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-900/30 dark:text-rose-100'
            : showCheckIcon
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-100'
              : isCurrent
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-100'
                : 'border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400';

          return (
            <div key={step.key} className="flex flex-col items-center gap-2 text-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${circleClasses}`}
              >
                {showRejectedX ? (
                  <X className="h-5 w-5" />
                ) : showCheckIcon ? (
                  <Check className="h-5 w-5" />
                ) : showIndex ? (
                  idx + 1
                ) : null}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {step.label}
                </p>
                {step.description ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {step.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusStepper;
