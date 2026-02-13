import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import type { CargoInspectionSession, LineInspection } from '../types';
import { usePackingListLines } from '@/features/packing-list/hooks/use-packing-list-lines';

interface SessionDetailProps {
  session: CargoInspectionSession;
  onSelectLine: (line: LineInspection) => void;
  lines?: LineInspection[];
  lineDetails?: Record<string, LineInspection>;
  isLoadingLines: boolean;
  refetchLines: () => void;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  onSelectLine,
  lines,
  lineDetails = {},
  isLoadingLines,
  refetchLines,
}) => {
  const formatCargoQuantity = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    if (Number.isInteger(value)) return String(value);
    const asString = String(value);
    return /\.0+$/.test(asString) ? asString.replace(/\.0+$/, '') : asString;
  };

  const { data: packingListLinesData, isLoading: isLoadingPackingList } =
    usePackingListLines(session.packingListId, 1, 100);

  const isLoading = isLoadingLines || isLoadingPackingList;

  const normalizedLines = useMemo(
    () => (Array.isArray(lines) ? lines : []),
    [lines],
  );

  const packingListLines = useMemo(
    () => packingListLinesData?.results ?? [],
    [packingListLinesData],
  );

  const packingListLineById = useMemo(() => {
    const map = new Map<string, (typeof packingListLines)[number]>();
    packingListLines.forEach((line) => {
      if (line?.id) {
        map.set(line.id, line);
      }
    });
    return map;
  }, [packingListLines]);

  const packingListLineIndexById = useMemo(() => {
    const map = new Map<string, number>();
    packingListLines.forEach((line, index) => {
      if (line?.id) {
        map.set(line.id, index);
      }
    });
    return map;
  }, [packingListLines]);

  const mergedLines = useMemo(() => {
    return normalizedLines.map((line, index) => {
      const detail = lineDetails[line.id];
      const packingListLineId =
        detail?.packingListLineId ?? line.packingListLineId;
      const packingListLine = packingListLineId
        ? packingListLineById.get(packingListLineId)
        : undefined;
      const lineNumber =
        typeof line.lineNumber === 'number'
          ? line.lineNumber
          : packingListLineId && packingListLineIndexById.has(packingListLineId)
            ? (packingListLineIndexById.get(packingListLineId) ?? index) + 1
            : index + 1;
      const checkedPackages =
        Array.isArray(detail?.packageInspections) && detail.packageInspections.length > 0
          ? detail.packageInspections.reduce(
            (sum, pkg) => sum + (pkg.packageCount ?? 0),
            0,
          )
          : line.checkedPackages;
      const status =
        (detail as any)?.status ??
        (line as any).status ??
        (detail?.checkedFlag || line.checkedFlag ? 'COMPLETED' : 'PENDING');
      const checkedFlag =
        status === 'COMPLETED' ||
        status === 'DONE' ||
        detail?.checkedFlag === true ||
        detail?.checkedFlag === 'yes' ||
        line.checkedFlag === true ||
        line.checkedFlag === 'yes';
      return {
        ...line,
        ...(detail ?? {}),
        lineNumber,
        status,
        checkedFlag,
        checkedPackages,
        packingListLineId,
        ...(packingListLine
          ? {
            commodityDescription: packingListLine.commodityDescription,
            packageTypeCode: packingListLine.packageTypeCode,
            cargoType: packingListLine.cargoType,
            quantity: packingListLine.quantity,
            unitOfMeasure: packingListLine.unitOfMeasure,
            grossWeightKg: packingListLine.grossWeightKg,
            volumeM3: packingListLine.volumeM3,
            shipmarks: packingListLine.shipmarks,
            imdg: packingListLine.imdg,
          }
          : {}),
        totalPackages: packingListLine?.numberOfPackages ?? line.totalPackages ?? 0,
      };
    });
  }, [lineDetails, normalizedLines, packingListLineById, packingListLineIndexById]);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <LoadingSpinner size="lg" />
        </div>
      ) : (lines === undefined || lines === null) ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Failed to load line items.</p>
              <button
                type="button"
                onClick={() => refetchLines()}
                className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-300"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : mergedLines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
            <AlertCircle className="h-6 w-6 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900 dark:text-gray-100">No line items found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mergedLines.map((line, index) => (
            <button
              key={line.id}
              type="button"
              onClick={() => onSelectLine(line)}
              className="group relative flex w-full flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700"
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${line.checkedFlag
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                    #{line.lineNumber ?? index + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {line.commodityDescription || 'No Description'}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                      <div className="flex flex-wrap gap-2 border-t border-gray-50 dark:border-gray-800">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {line.packageTypeCode || 'Unknown Type'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-gray-50 dark:border-gray-800">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {line.cargoType || 'General'}
                        </span>
                      </div>
                      {(line.shipmarks || line.imdg) && (
                        <div className="flex flex-wrap gap-2 border-t border-gray-50 dark:border-gray-800">
                          {line.shipmarks && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              Marks: {line.shipmarks}
                            </span>
                          )}
                          {line.imdg && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                              IMDG: {line.imdg}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${line.checkedFlag
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    }`}
                >
                  {line.checkedFlag ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" />
                      Pending
                    </>
                  )}
                </span>
              </div>

              <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Packages</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    {line.checkedPackages ?? 0} / {line.actualPackageCount ?? line.totalPackages ?? 0}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Cargo Quantity</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    {formatCargoQuantity(line.quantity)} {line.unitOfMeasure ?? ''}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Weight</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    {line.grossWeightKg ?? (line as any).weightKg ?? '—'} kg
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Volume</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    {line.volumeM3 ?? '—'} m³
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
