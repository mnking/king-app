import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { usePlannedDestuffingHblIds } from '../../hooks';
import { usePartialDestuffingContainers } from '../hooks/use-partial-destuffing-containers';
import { filterPartialContainersByPlannedHbls } from '../utils/partial-container-utils';

const formatLabel = (value?: string | null) => value ?? '—';

export const PartialContainersList: React.FC = () => {
  const {
    data = [],
    isLoading,
    isError,
    error,
  } = usePartialDestuffingContainers();

  const { data: plannedHblIds = [] } = usePlannedDestuffingHblIds();
  const plannedHblIdSet = useMemo(() => new Set(plannedHblIds), [plannedHblIds]);
  const items = useMemo(
    () => filterPartialContainersByPlannedHbls(data ?? [], plannedHblIdSet),
    [data, plannedHblIdSet],
  );

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Partial Destuffing Containers
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Containers resealed before all HBLs were done.
          </p>
        </div>
      </div>

      {isError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              Failed to load partial containers. {error?.message ?? 'Please try again.'}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <LoadingSpinner className="h-4 w-4" /> Loading partial containers...
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-8 text-center text-gray-600 dark:text-gray-300">
          <p className="text-base font-medium">📦 No partial containers</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We’ll show resealed destuffing containers here once available.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => {
            const containerNo = formatLabel(
              item.orderContainer?.containerNo ?? item.orderContainer?.containerNumber,
            );
            const sealNumber = formatLabel(
              item.latestSealNumber ?? item.summary?.sealNumber ?? item.orderContainer?.sealNumber,
            );
            const typeCode =
              item.orderContainer?.summary?.typeCode ?? item.orderContainer?.containerType ?? null;
            const orderCode = formatLabel(item.receivePlanCode);
            const bookingNumber = item.orderContainer?.bookingNumber ?? null;
            const forwarderName = item.orderContainer?.forwarderName ?? null;
            const hblNumbers: string[] =
              (item.orderContainer?.hbls ?? item.hbls ?? [])
                .map((hbl) => hbl?.hblNo)
                .filter(Boolean) as string[];
            const customsStatus = item.orderContainer?.customsStatus ?? null;
            const cargoReleaseStatus = item.orderContainer?.cargoReleaseStatus ?? null;
            const isPriority = item.orderContainer?.isPriority;

            return (
              <div
                key={item.id}
                className="relative rounded-lg border-l-4 border-l-orange-500 dark:border-l-orange-400 border-r border-t border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono tracking-tight">
                        {containerNo}
                      </h4>
                      {isPriority && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 border border-pink-300 dark:border-pink-700">
                          Priority
                        </span>
                      )}
                    </div>
                    {typeCode && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold font-mono border border-gray-200 dark:border-gray-700">
                        {typeCode}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Seal</p>
                      <p className="text-xs font-mono text-gray-900 dark:text-gray-100">
                        {sealNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5">MBL</p>
                      <p className="text-xs font-mono text-gray-900 dark:text-gray-100">
                        {formatLabel(item.orderContainer?.mblNumber)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Order Code</p>
                      <p className="text-xs font-mono text-gray-900 dark:text-gray-100">
                        {orderCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Booking Number</p>
                      <p className="text-xs font-mono text-gray-900 dark:text-gray-100">
                        {formatLabel(bookingNumber)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Forwarder</p>
                      <p className="text-xs font-mono text-gray-900 dark:text-gray-100">
                        {formatLabel(forwarderName)}
                      </p>
                    </div>
                  </div>

                  {(customsStatus || cargoReleaseStatus) && (
                    <div className="flex flex-wrap gap-2">
                      {customsStatus && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Customs: {customsStatus}
                        </span>
                      )}
                      {cargoReleaseStatus && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                          Cargo: {cargoReleaseStatus}
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      House B/L ({hblNumbers.length})
                    </p>
                    {hblNumbers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {hblNumbers.map((hblNo) => (
                          <span
                            key={hblNo}
                            className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs font-mono font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            {hblNo}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">No HBLs</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
