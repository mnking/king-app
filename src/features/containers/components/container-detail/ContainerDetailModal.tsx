import React from 'react';
import { useContainer } from '@/features/containers/hooks/use-containers-query';
import ContainerLifecycleCard from './ContainerLifecycleCard';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';
import { isCycleDisplayable } from '@/features/containers/utils/cycleStatus';

const InfoCard: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-lg font-semibold text-gray-900 dark:text-gray-50 mt-1">{value}</p>
  </div>
);

interface ContainerDetailModalProps {
  isOpen: boolean;
  containerId: string | null;
  onClose: () => void;
}

export const ContainerDetailModal: React.FC<ContainerDetailModalProps> = ({
  isOpen,
  containerId,
  onClose,
}) => {
  const { data: container, isLoading } = useContainer(containerId ?? '', { cycle: 'true' });

  if (!isOpen) {
    return null;
  }

  const hasData = Boolean(container);
  const containerNumber = container?.number ?? '';
  const cycle = container?.currentCycle;
  const showActiveCycleDetails = isCycleDisplayable(cycle);
  const status = cycle?.status ?? 'N/A';
  const statusStyles: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  };
  const badgeClass = statusStyles[status] ?? statusStyles.ACTIVE;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Container detail
            </p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {containerNumber || 'Loading...'}
              </h2>
              {cycle && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                  {status}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:border-gray-600"
            onClick={onClose}
            disabled={isLoading}
          >
            Close
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          <div className="space-y-6 px-6 py-6">
            {isLoading && (
              <p className="text-gray-600 dark:text-gray-400">Loading container details…</p>
            )}
            {!isLoading && !hasData && (
              <p className="text-gray-600 dark:text-gray-400">
                Unable to load container information.
              </p>
            )}
            {container && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoCard label="Container Number" value={container.number} />
                  <InfoCard
                    label="Type"
                    value={
                      container.containerType
                        ? `${container.containerType.code ?? ''} ${container.containerType.size ?? ''}`.trim()
                        : '—'
                    }
                  />
                  {showActiveCycleDetails && (
                    <>
                      <InfoCard label="Current Cycle" value={cycle?.code ?? '—'} />
                      <InfoCard
                        label="Cycle Transactions"
                        value={
                          container.currentCycleTransactionCount != null
                            ? container.currentCycleTransactionCount
                            : '—'
                        }
                      />
                    </>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                <InfoCard label="Created At" value={formatDateTimeForDisplay(container.createdAt)} />
                <InfoCard label="Updated At" value={formatDateTimeForDisplay(container.updatedAt)} />
                </div>

                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Lifecycle timeline
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {cycle?.code ?? 'Standalone view'}
                    </span>
                  </div>
                  <div className="mt-4">
                    <ContainerLifecycleCard
                      container={container}
                      activeCycle={cycle ?? null}
                      onClose={onClose}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
