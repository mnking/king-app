import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { cargoInspectionApi } from '@/services/apiCargoInspection';
import type {
  CargoInspectionSession,
  FlowType,
  LineInspection,
} from '../types';
import type { PackingListListItem } from '@/features/packing-list/types';
import { SessionDetail } from './SessionDetail';
import { LineInspectionDetail } from './LineInspectionDetail';
import { OutboundPackageChecking } from './OutboundPackageChecking';
import {
  useCargoInspectionSessions,
  useSessionLineInspections,
} from '../hooks';

type ViewState = 'session-detail' | 'line-detail' | 'outbound-checking';

interface CargoInspectionWorkflowProps {
  packingListId: string;
  packingList?: PackingListListItem;
  packingListNumber?: string | null;
  flowType: FlowType;
  initialSession?: { id: string; flowType: FlowType };
  onComplete?: () => void;
  onCancel?: () => void;
  initialSessionId?: string;
}

export const CargoInspectionWorkflow: React.FC<
  CargoInspectionWorkflowProps
> = ({
  packingListId,
  packingList,
  packingListNumber: _packingListNumber,
  flowType,
  initialSession,
  onComplete,
  onCancel: _onCancel,
  initialSessionId,
}) => {
    const [view, setView] = useState<ViewState>('session-detail');
    const [selectedSession, setSelectedSession] =
      useState<CargoInspectionSession | null>(null);
    const [selectedLine, setSelectedLine] = useState<LineInspection | null>(null);
    const [lineDetails, setLineDetails] = useState<Record<string, LineInspection>>({});
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const sessionsQuery = useCargoInspectionSessions(packingListId, flowType);

    // Lifted state for lines and progress
    const {
      data: lines,
      isLoading: isLoadingLines,
      refetch: refetchLines,
    } = useSessionLineInspections(selectedSession?.id ?? '');

    const sessions = useMemo(
      () => sessionsQuery.data ?? [],
      [sessionsQuery.data],
    );

    useEffect(() => {
      if (selectedSession) return;
      if (initialSession) {
        setSelectedSession({
          id: initialSession.id,
          packingListId,
          flowType: initialSession.flowType,
          status: 'checking',
          createdAt: '',
          createdBy: '',
          updatedAt: '',
          updatedBy: '',
        });
        setView('session-detail');
        return;
      }
      if (initialSessionId && sessions.length > 0) {
        const match = sessions.find((session) => session.id === initialSessionId);
        if (match) {
          setSelectedSession(match);
          setView('session-detail');
          return;
        }
      }
      if (!selectedSession && sessions.length > 0) {
        setSelectedSession(sessions[0]);
        setView('session-detail');
      }
    }, [initialSession, initialSessionId, packingListId, selectedSession, sessions]);

    // Fetch line details when lines change
    useEffect(() => {
      if (!lines || !Array.isArray(lines)) return;

      const loadDetails = async () => {
        const missing = lines.filter((line) => {
          const detail = lineDetails[line.id];
          if (!detail) return true;
          // Refresh stale details when checked package counts differ
          const detailChecked = Array.isArray(detail.packageInspections)
            ? detail.packageInspections.reduce(
              (sum, pkg) => sum + (pkg.packageCount ?? 0),
              0,
            )
            : detail.checkedPackages;
          const detailActual = detail.actualPackageCount;
          if (
            typeof line.checkedPackages === 'number' &&
            typeof detailChecked === 'number' &&
            line.checkedPackages !== detailChecked
          ) {
            return true;
          }
          if (
            typeof line.actualPackageCount === 'number' &&
            typeof detailActual === 'number' &&
            line.actualPackageCount !== detailActual
          ) {
            return true;
          }
          return false;
        });
        if (missing.length === 0) return;

        setIsLoadingDetails(true);
        try {
          const fetched = await Promise.all(
            missing.map((line) =>
              cargoInspectionApi
                .getLineDetail(line.id)
                .then((res: { data: LineInspection }) => res.data)
                .catch(() => null),
            ),
          );
          const next: Record<string, LineInspection> = {};
          fetched.forEach((detail: LineInspection | null) => {
            if (detail?.id) {
              next[detail.id] = detail;
            }
          });
          if (Object.keys(next).length > 0) {
            setLineDetails((prev) => ({ ...prev, ...next }));
          }
        } finally {
          setIsLoadingDetails(false);
        }
      };
      void loadDetails();
    }, [lines, lineDetails]);

    const progress = useMemo(() => {
      if (!lines || !Array.isArray(lines) || lines.length === 0) return { checked: 0, total: 0, percentage: 0 };

      // Simple calculation based on lines data directly
      // Note: detailed calculation involving packageInspections might be better done in SessionDetail
      // but for the header we need a rough estimate or we duplicate the logic.
      // Let's duplicate the logic for now to ensure the header is accurate.
      const checked = lines.reduce((sum, line) => {
        const detail = lineDetails[line.id];
        const packageChecked = Array.isArray(detail?.packageInspections)
          ? detail.packageInspections.reduce(
            (pkgSum, pkg) => pkgSum + (pkg.packageCount ?? 0),
            0,
          )
          : Number(line.checkedPackages) || 0;
        return sum + packageChecked;
      }, 0);

      const total = lines.reduce((sum, line) => {
        const detail = lineDetails[line.id];
        const detailActual =
          typeof detail?.actualPackageCount === 'number'
            ? detail.actualPackageCount
            : undefined;
        const totalPackages =
          typeof detailActual === 'number'
            ? detailActual
            : typeof line.actualPackageCount === 'number'
              ? line.actualPackageCount
              : typeof line.totalPackages === 'number'
                ? line.totalPackages
                : 0;
        return sum + totalPackages;
      }, 0);

      return {
        checked,
        total,
        percentage: total > 0 ? Math.round((checked / total) * 100) : 0
      };
    }, [lines, lineDetails]);
    const showMergedSessionHeader = false;

    useEffect(() => {
      if (selectedSession) return;

      if (initialSession) {
        setSelectedSession({
          id: initialSession.id,
          packingListId,
          flowType: initialSession.flowType,
          status: 'checking',
          createdAt: '',
          createdBy: '',
          updatedAt: '',
          updatedBy: '',
        });
        setView('session-detail');
        return;
      }

      if (initialSessionId && sessions.length > 0) {
        const match = sessions.find((session) => session.id === initialSessionId);
        if (match) {
          setSelectedSession(match);
          setView('session-detail');
          return;
        }
      }

      if (!selectedSession && sessions.length > 0) {
        setSelectedSession(sessions[0]);
        setView('session-detail');
      }
    }, [initialSession, initialSessionId, packingListId, selectedSession, sessions]);

    const handleSelectLine = (line: LineInspection) => {
      setSelectedLine(line);
      if (flowType === 'OUTBOUND') {
        setView('outbound-checking');
      } else {
        setView('line-detail');
      }
    };

    const resetToSessions = (lineIdToRefresh?: string) => {
      setView('session-detail');
      setSelectedLine(null);
      if (lineIdToRefresh) {
        setLineDetails((prev) => {
          if (!prev[lineIdToRefresh]) return prev;
          const next = { ...prev };
          delete next[lineIdToRefresh];
          return next;
        });
      }
      refetchLines();
    };

    const refreshLineDetail = (lineInspectionId: string) => {
      setLineDetails((prev) => {
        if (!prev[lineInspectionId]) return prev;
        const next = { ...prev };
        delete next[lineInspectionId];
        return next;
      });
      refetchLines();
    };

    const selectedLineWithDetails = selectedLine
      ? { ...selectedLine, ...(lineDetails[selectedLine.id] ?? {}) }
      : null;

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* <div className="border-b border-gray-100 px-6 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-200">{flowType}</span> • {headerDescription}
            </p>
          </div> */}

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Packing List: {_packingListNumber}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{progress.checked} checked</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <span>{progress.total} total</span>
              {/* <div className="text-right">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Overall Progress</p>
                <div className="flex items-center justify-end gap-2">
                  {isLoadingDetails && <LoadingSpinner size="sm" />}
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {progress.percentage}%
                  </p>
                </div>
              </div> */}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Overall Progress</p>
              <div className="flex items-center justify-end gap-2">
                {isLoadingDetails && <LoadingSpinner size="sm" />}
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {progress.percentage}%
                </p>
              </div>
            </div>
          </div>

          {packingList && (
            <div className="bg-gray-50/50 px-6 py-4 dark:bg-gray-800/50">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">MBL</p>
                  <p className="font-medium text-gray-900 dark:text-gray-200">{packingList.mbl ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">HBL</p>
                  <p className="font-medium text-gray-900 dark:text-gray-200">{packingList.hblData?.hblCode ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Forwarder</p>
                  <p className="font-medium text-gray-900 dark:text-gray-200">{packingList.hblData?.forwarderName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Packages</p>
                  <p className="font-medium text-gray-900 dark:text-gray-200">{packingList.numberOfPackages ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">ETA</p>
                  <p className="font-medium text-gray-900 dark:text-gray-200">{packingList.eta ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">ATA</p>
                  <p className="font-medium text-gray-900 dark:text-gray-200">{packingList.ata ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Weight (KG)</p>
                  <p className="font-medium text-gray-900 dark:text-gray-200">{packingList.weight ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Volume (m³)</p>
                  <p className="font-medium text-gray-900 dark:text-gray-200">{packingList.volume ?? '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Merged Session Header */}
          {showMergedSessionHeader && selectedSession && (
            <div className="border-t border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                        Session {selectedSession.id}
                      </h3>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                        {flowType}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{progress.checked} checked</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500 ease-out"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <span>{progress.total} total</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Overall Progress</p>
                  <div className="flex items-center justify-end gap-2">
                    {isLoadingDetails && <LoadingSpinner size="sm" />}
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {progress.percentage}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {view === 'session-detail' && selectedSession ? (
          <SessionDetail
            session={selectedSession}
            onSelectLine={handleSelectLine}
            lines={lines}
            lineDetails={lineDetails}
            isLoadingLines={isLoadingLines}
            refetchLines={refetchLines}
          />
        ) : null}

        {view === 'line-detail' && selectedLineWithDetails ? (
          <div className="space-y-4">
            <LineInspectionDetail
              lineInspectionId={selectedLineWithDetails.id}
              line={selectedLineWithDetails}
              onBack={() => resetToSessions(selectedLineWithDetails.id)}
              onCheckPackages={() => { }}
              onCompleteLine={onComplete}
              onLineUpdated={refreshLineDetail}
              sessionId={selectedSession?.id}
            />
          </div>
        ) : null}

        {view === 'outbound-checking' && selectedSession ? (
          <OutboundPackageChecking
            packingListId={selectedSession.packingListId}
            onBack={resetToSessions}
          />
        ) : null}
      </div>
    );
  };
