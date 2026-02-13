import React from 'react';
import { Package, FileText, Receipt, User, Zap } from 'lucide-react';
import type { UnplannedDestuffingContainer } from '../types';
import {
  CARGO_RELEASE_STATUS,
  type CargoReleaseStatus,
} from '@/shared/constants/container-status';

interface UnplannedContainersListProps {
  containers: UnplannedDestuffingContainer[];
  isLoading?: boolean;
  error?: string | null;
  filterSlot?: React.ReactNode;
}

const formatLabel = (value?: string | null) => value ?? '—';

const toCargoReleaseStatusEnum = (value?: string | null): CargoReleaseStatus | null => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');

  return Object.values(CARGO_RELEASE_STATUS).includes(normalized as CargoReleaseStatus)
    ? (normalized as CargoReleaseStatus)
    : null;
};

const allowDestuffingBadgeClass = (isAllowed: boolean) =>
  isAllowed
    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';

const cargoReleaseBadgeClass = (status: CargoReleaseStatus | null) =>
  status === CARGO_RELEASE_STATUS.APPROVED
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';

const extractTypeCode = (container: UnplannedDestuffingContainer): string | null => {
  const summaryType = container.summary?.typeCode;
  if (summaryType) return summaryType;

  const enrichedType = container.enrichedHbls?.find(
    (hbl) => hbl?.containerTypeCode,
  )?.containerTypeCode;
  if (enrichedType) return enrichedType;

  return null;
};

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="h-28 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
      />
    ))}
  </div>
);

export const UnplannedContainersList: React.FC<UnplannedContainersListProps> = ({
  containers,
  isLoading = false,
  error,
  filterSlot,
}) => {
  if (isLoading) {
    return (
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Unplanned Containers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading containers eligible for destuffing…
          </p>
        </div>
        <div className="mt-6">
          <LoadingSkeleton />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      {filterSlot && <div className="flex flex-col gap-3 text-gray-900 dark:text-gray-100">{filterSlot}</div>}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 dark:border-red-700/70 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {!containers.length && !error ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-300">
          No unplanned containers available right now.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {containers.map((container) => {
            const hblNumbers = (container.enrichedHbls || [])
              .map((hbl) => hbl.hblNo)
              .filter(Boolean);
            const typeCode = extractTypeCode(container);
            const orderCode = container.bookingOrder?.code;
            const cargoReleaseStatus = container.cargoReleaseStatus;
            const cargoReleaseStatusEnum = toCargoReleaseStatusEnum(cargoReleaseStatus);
            const allowDestuffing = container.allowStuffingOrDestuffing === true;
            const isPriority = container.isPriority;

            return (
              <div
                key={container.id}
                className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200 p-5"
              >
                {/* Header: Container Number + Priority Badge + Type */}
                <div className="flex items-start gap-3 mb-4">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-1">
                      {formatLabel(container.containerNo)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">
                        {typeCode ? typeCode : 'Type: N/A'}
                      </span>
                      {container.sealNumber && (
                        <>
                          <span>•</span>
                          <span>Seal: {formatLabel(container.sealNumber)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isPriority && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 whitespace-nowrap transition-colors duration-150">
                        <Zap className="h-3.5 w-3.5" />
                        High Priority
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm border-t dark:border-gray-700 pt-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order Code</p>
                    <div className="flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatLabel(orderCode)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Booking Number</p>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatLabel(container.bookingOrder?.bookingNumber)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">MBL</p>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatLabel(container.mblNumber)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Forwarder</p>
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatLabel(container.forwarderName)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Pills (Cargo Release) */}
                {cargoReleaseStatus && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cargoReleaseBadgeClass(cargoReleaseStatusEnum)}`}
                    >
                      Cargo Release: {cargoReleaseStatusEnum ?? formatLabel(cargoReleaseStatus)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${allowDestuffingBadgeClass(allowDestuffing)}`}
                    >
                      Allow Destuffing: {allowDestuffing ? 'Allowed' : 'Not Allowed'}
                    </span>
                  </div>
                )}

                {/* HBLs Section */}
                {hblNumbers.length > 0 && (
                  <div className="border-t dark:border-gray-700 pt-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      House B/L ({hblNumbers.length})
                    </p>
                    <div className="max-h-32 overflow-y-auto p-1 -m-1">
                      <div className="flex flex-wrap gap-1.5">
                        {hblNumbers.map((hblNo) => (
                          <span
                            key={hblNo}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs font-mono font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            {hblNo}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
