import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardList, PackageOpen } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { cargoInspectionApi } from '@/services/apiCargoInspection';
import { cargoInspectionQueryKeys, useCreateInspectionSession } from '@/shared/features/cargo-inspection/hooks';
import { updateHblBypassFlag } from '@/services/apiDestuffingExecution';
import { containerHblsQueryKeyWithIds } from '@/features/destuffing-execution/hooks/use-hbl-destuff-operations';
import { useContainerHblsQuery } from '@/features/destuffing-execution/hooks';
import type { HblDestuffStatus } from '@/features/destuffing-execution/types';
import { DestuffResultModal } from './modals/DestuffResultModal';
import { mergePlannedHbls, renderHblStatus } from './containerListHelpers';

interface ExpandedHblListProps {
  planId: string;
  containerId: string;
  baseHbls: HblDestuffStatus[];
  hblIds: string[];
  containerNumber?: string | null;
  canWrite?: boolean;
  onOpenInspection: (args: {
    packingListId: string;
    packingListNo: string | null;
    sessionId?: string | null;
  }) => void;
}

export const ExpandedHblList = ({
  planId,
  containerId,
  baseHbls,
  hblIds,
  containerNumber,
  canWrite = true,
  onOpenInspection,
}: ExpandedHblListProps) => {
  const { data = [], isLoading, isError } = useContainerHblsQuery(
    planId,
    containerId,
    hblIds,
    containerNumber,
    {
      enabled: Boolean(planId && containerId && hblIds.length > 0),
    },
  );
  const mergedHbls = useMemo(() => mergePlannedHbls(baseHbls, data), [baseHbls, data]);
  const [resultHbl, setResultHbl] = useState<HblDestuffStatus | null>(null);
  const [processingDestuffHblId, setProcessingDestuffHblId] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();
  const createInspectionSession = useCreateInspectionSession();

  const updateHblLocalState = (hblId: string, patch: Partial<HblDestuffStatus>) => {
    queryClient.setQueryData<HblDestuffStatus[]>(
      containerHblsQueryKeyWithIds(planId, containerId, hblIds),
      (previous) =>
        previous
          ? previous.map((item) => (item.hblId === hblId ? { ...item, ...patch } : item))
          : previous,
    );
  };

  const ensureInspectionSession = async (packingListId: string): Promise<string | null> => {
    const sessions = (await queryClient.fetchQuery({
      queryKey: cargoInspectionQueryKeys.sessions.list(packingListId, 'INBOUND'),
      queryFn: async () => {
        const response = await cargoInspectionApi.getSessions(packingListId, 'INBOUND');
        return Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as { results?: unknown[] }).results)
            ? (response.data as { results: unknown[] }).results
            : [];
      },
    })) as { id: string }[];

    if (Array.isArray(sessions) && sessions[0]?.id) {
      return sessions[0].id;
    }

    const created = await createInspectionSession.mutateAsync({ packingListId, flowType: 'INBOUND' });
    return created?.id ?? null;
  };

  const proceedDestuff = async (hbl: HblDestuffStatus, bypassFlag: boolean) => {
    if (!hbl.packingListId) {
      toast.error('Missing packing list for this HBL.');
      return;
    }

    let sessionId: string | null | undefined = hbl.inspectionSessionId;

    try {
      sessionId = sessionId ?? (await ensureInspectionSession(hbl.packingListId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Backend not ready, opening inspection with mock session';
      toast(message);
    }

    // Optimistic local state: mark as in-progress and persist chosen bypass flag
    updateHblLocalState(hbl.hblId, {
      destuffStatus: 'in-progress',
      bypassStorageFlag: bypassFlag,
      inspectionSessionId: sessionId ?? null,
    });

    onOpenInspection({
      packingListId: hbl.packingListId,
      packingListNo: hbl.packingListNo ?? null,
      sessionId: sessionId ?? undefined,
    });
  };

  const handleDestuffClick = async (hbl: HblDestuffStatus) => {
    if (!canWrite) {
      toast.error('You do not have permission to update destuffing execution.');
      return;
    }

    setProcessingDestuffHblId(hbl.hblId);
    try {
      const bypassStorageFlag = false;
      if (hbl.bypassStorageFlag !== bypassStorageFlag) {
        await updateHblBypassFlag(hbl.hblId, bypassStorageFlag);
        updateHblLocalState(hbl.hblId, { bypassStorageFlag });
        await queryClient.invalidateQueries({
          queryKey: containerHblsQueryKeyWithIds(planId, containerId, hblIds),
        });
      }

      await proceedDestuff({ ...hbl, bypassStorageFlag }, bypassStorageFlag);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start destuff';
      toast.error(message);
    } finally {
      setProcessingDestuffHblId((current) =>
        current === hbl.hblId ? null : current,
      );
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
            House B/L ({baseHbls.length})
          </p>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Inline View
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && baseHbls.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
            <LoadingSpinner className="h-5 w-5" />
            <span>Loading HBLs...</span>
          </div>
        ) : isError && baseHbls.length === 0 ? (
          <div className="rounded-lg border border-red-200 dark:border-red-700/70 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-200">
            Failed to load HBLs. Please try again.
          </div>
        ) : mergedHbls.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No planned HBLs for this container.
          </div>
        ) : (
          <div className="space-y-2">
            {mergedHbls.map((hbl) => {
              return (
                <div
                  key={hbl.hblId}
                  className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                          {hbl.hblCode}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          PL: {hbl.packingListNo ?? '—'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {renderHblStatus(hbl.destuffStatus)}
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={
                            !canWrite ||
                            hbl.destuffStatus === 'done' ||
                            hbl.destuffStatus === 'on-hold' ||
                            processingDestuffHblId === hbl.hblId
                          }
                          onClick={() => handleDestuffClick(hbl)}
                        >
                          <PackageOpen className="mr-1 h-3.5 w-3.5" />
                          Destuff
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          disabled={!canWrite || hbl.destuffStatus === 'waiting'}
                          onClick={() => setResultHbl(hbl)}
                        >
                          <ClipboardList className="mr-1 h-3.5 w-3.5" />
                          Result
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {resultHbl && (
        <DestuffResultModal
          planId={planId}
          containerId={containerId}
          hbl={resultHbl}
          onClose={() => setResultHbl(null)}
        />
      )}
    </div>
  );
};
