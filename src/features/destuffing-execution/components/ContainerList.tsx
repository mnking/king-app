import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronDown, ChevronUp, Package, Unlock, CheckCircle, FileText, Lock, Ship, Box } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/Button';
import { getContainerHblsByIds } from '@/services/apiDestuffingExecution';
import { containerHblsQueryKeyWithIds } from '@/features/destuffing-execution/hooks/use-hbl-destuff-operations';
import { useCompleteContainer } from '@/features/destuffing-execution/hooks/use-container-seal-operations';
import type {
  DestuffingPlan,
  DestuffingPlanContainer,
  HblDestuffStatus,
} from '@/features/destuffing-execution/types';
import { ExpandedHblList } from './ExpandedHblList';
import {
  formatStatus,
  getContainerBaseHbls,
  mergePlannedHbls,
  renderWorkingStatus,
} from './containerListHelpers';
import { ResealModal } from './modals/ResealModal';
import { UnsealConfirmModal } from './modals/UnsealConfirmModal';
import { CargoInspectionModal, type InspectionModalState } from './modals/CargoInspectionModal';

interface ContainerListProps {
  plan: DestuffingPlan;
  canWrite?: boolean;
}

const isConflictError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return false;
  }

  return (error as { status?: number }).status === 409;
};

const getPlannedCount = (container: DestuffingPlanContainer) =>
  container.summary?.plannedHbls?.length ??
  container.summary?.selectedHbls?.length ??
  container.selectedHbls?.length ??
  container.hbls?.length ??
  0;

const getTotalHbl = (container: DestuffingPlanContainer) =>
  container.orderContainer?.hbls?.length ?? getPlannedCount(container);

export const ContainerList = ({ plan, canWrite = true }: ContainerListProps) => {
  const [unsealContainerId, setUnsealContainerId] = useState<string | null>(null);
  const [resealContainerId, setResealContainerId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [expandedContainerId, setExpandedContainerId] = useState<string | null>(null);
  const [inspectionModal, setInspectionModal] = useState<InspectionModalState | null>(null);
  const [, bumpContainerHblsVersion] = useState(0);
  const prefetchedKeysRef = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { mutateAsync: completeMutate, isLoading: isCompleting } = useCompleteContainer();

  const containers = useMemo(
    () => plan.containers ?? [],
    [plan.containers],
  );

  useEffect(() => {
    setExpandedContainerId(null);
  }, [plan.id]);

  useEffect(() => {
    containers.forEach((container) => {
      const baseHbls = getContainerBaseHbls(container);
      const hblIds = baseHbls.map((hbl) => hbl.hblId);
      if (!hblIds.length) return;

      const key = containerHblsQueryKeyWithIds(plan.id, container.id, hblIds).join('|');
      if (prefetchedKeysRef.current.has(key)) return;

      prefetchedKeysRef.current.add(key);

      void queryClient
        .prefetchQuery({
          queryKey: containerHblsQueryKeyWithIds(plan.id, container.id, hblIds),
          queryFn: async () => {
            const response = await getContainerHblsByIds(
              plan.id,
              container.id,
              hblIds,
              container.orderContainer?.containerNo ?? undefined,
            );
            return response.data?.plannedHbls ?? [];
          },
          staleTime: 0,
        })
        .then(() => bumpContainerHblsVersion((value) => value + 1));
    });
  }, [containers, plan.id, queryClient]);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type !== 'queryUpdated') return;
      const key = event.query.queryKey;
      if (
        Array.isArray(key) &&
        key[0] === 'destuffing-execution' &&
        key[1] === 'planned-hbls' &&
        key[2] === plan.id
      ) {
        bumpContainerHblsVersion((value) => value + 1);
      }
    });

    return unsubscribe;
  }, [plan.id, queryClient]);

  if (!containers.length) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-full mb-4">
            <Package className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            No containers assigned
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto">
            This plan currently has no containers pending destuffing operations.
          </p>
        </div>
      </div>
    );
  }

  const handleComplete = async (container: DestuffingPlanContainer) => {
    if (!canWrite) {
      toast.error('You do not have permission to update destuffing execution.');
      return;
    }
    if (container.cargoLoadedStatus === 'empty') {
      toast.error('Cannot complete a container that is already empty.');
      return;
    }

    const containerId = container.id;
    const baseHbls = getContainerBaseHbls(container);
    const containerHblIds = baseHbls.map((hbl) => hbl.hblId);
    const containerNumber = container.orderContainer?.containerNo ?? null;

    if (containerHblIds.length === 0) {
      toast.error('No HBLs found for this container.');
      return;
    }

    const containerHbls =
      queryClient.getQueryData<HblDestuffStatus[]>(
        containerHblsQueryKeyWithIds(plan.id, containerId, containerHblIds),
      ) ??
      (await queryClient.fetchQuery({
        queryKey: containerHblsQueryKeyWithIds(plan.id, containerId, containerHblIds),
        queryFn: async () => {
          const response = await getContainerHblsByIds(
            plan.id,
            containerId,
            containerHblIds,
            containerNumber ?? undefined,
          );
          return response.data?.plannedHbls ?? [];
        },
      }));

    const resolvedHbls = mergePlannedHbls(baseHbls, containerHbls);

    if (resolvedHbls.some((hbl) => hbl.destuffStatus === 'in-progress')) {
      toast.error('Cannot complete while an HBL is in-progress.');
      return;
    }

    try {
      await completeMutate({ planId: plan.id, containerId });
    } catch (error) {
      if (isConflictError(error)) {
        setResealContainerId(containerId);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              Containers
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {containers.length} container{containers.length !== 1 ? 's' : ''} assigned
            </p>
          </div>
        </div>
      </div>

      {/* Container List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {containers.map((container, index) => {
          const baseHbls = getContainerBaseHbls(container);
          const hblIds = baseHbls.map((hbl) => hbl.hblId);
          const cachedHbls =
            queryClient.getQueryData<HblDestuffStatus[]>(
              containerHblsQueryKeyWithIds(plan.id, container.id, hblIds),
            ) ?? null;
          const resolvedPlannedHbls = cachedHbls
            ? mergePlannedHbls(baseHbls, cachedHbls)
            : container.summary?.plannedHbls ?? null;
          const workingStatus = formatStatus(container.workingStatus);
          const plannedCount = resolvedPlannedHbls
            ? resolvedPlannedHbls.filter(
              (hbl) => hbl.destuffStatus === 'done' || hbl.destuffStatus === 'on-hold',
            ).length
            : getPlannedCount(container);
          const totalHbl = resolvedPlannedHbls ? resolvedPlannedHbls.length : getTotalHbl(container);
          const hasAnyHblCompleted = resolvedPlannedHbls
            ? resolvedPlannedHbls.some(
              (hbl) => hbl.destuffStatus === 'done' || hbl.destuffStatus === 'on-hold',
            )
            : false;

          return (
            <div
              key={container.id}
              className={`
                relative transition-all duration-200
                hover:bg-gray-50/80 dark:hover:bg-gray-800/30
                ${expandedContainerId === container.id
                  ? "bg-gray-50/30"
                  : ""
                }
                ${index !== containers.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}
              `}
            >
              {expandedContainerId === container.id && (
                <span
                  className="pointer-events-none absolute left-0 top-0 bottom-0 w-1 bg-green-500 dark:bg-green-400"
                  aria-hidden="true"
                />
              )}
              <div className="p-5 space-y-5">
                {/* Header: Container Number + Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <Box className="h-5 w-5" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                        {container.orderContainer?.containerNo ?? container.orderContainerId}
                      </h4>
                      {renderWorkingStatus(workingStatus)}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold border border-gray-200 dark:border-gray-700">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    {plannedCount}/{totalHbl} HBLs
                  </span>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                    <Lock className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold uppercase text-gray-500 mb-0.5">Seal No</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {container.orderContainer?.sealNumber ?? container.newSealNumber ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                    <Ship className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold uppercase text-gray-500 mb-0.5">MBL No</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {container.orderContainer?.mblNumber ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold uppercase text-gray-500 mb-0.5">Order Code</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {container.orderContainer?.bookingOrder?.code ??
                          container.orderContainer?.orderCode ??
                          '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 text-xs font-medium bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                    disabled={!canWrite || workingStatus !== 'waiting'}
                    onClick={() => {
                      setUnsealContainerId(container.id);
                      setSelectedContainerId(container.id);
                    }}
                  >
                    <Unlock className="mr-2 h-3.5 w-3.5" />
                    Unseal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 text-xs font-medium bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                    disabled={!['in-progress', 'done', 'on-hold'].includes(workingStatus)}
                    onClick={() => {
                      setExpandedContainerId((prev) =>
                        prev === container.id ? null : container.id,
                      );
                      setSelectedContainerId(container.id);
                    }}
                  >
                    {expandedContainerId === container.id ? (
                      <>
                        <ChevronUp className="mr-2 h-3.5 w-3.5" />
                        Hide HBLs
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-3.5 w-3.5" />
                        Show HBLs
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="h-9 px-4 text-xs font-medium shadow-sm hover:shadow transition-all"
                    disabled={
                      !canWrite ||
                      workingStatus !== 'in-progress' ||
                      container.cargoLoadedStatus === 'empty' ||
                      !hasAnyHblCompleted
                    }
                    loading={isCompleting && selectedContainerId === container.id}
                    onClick={() => {
                      setSelectedContainerId(container.id);
                      handleComplete(container).catch(() => { });
                    }}
                  >
                    <CheckCircle className="mr-2 h-3.5 w-3.5" />
                    Complete
                  </Button>
                </div>

                {/* Expanded HBL List */}
                {expandedContainerId === container.id && (
                  <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                    <ExpandedHblList
                      planId={plan.id}
                      containerId={container.id}
                      baseHbls={baseHbls}
                      hblIds={hblIds}
                      containerNumber={container.orderContainer?.containerNo}
                      canWrite={canWrite}
                      onOpenInspection={({ packingListId, packingListNo, sessionId }) =>
                        setInspectionModal({
                          packingListId,
                          packingListNo,
                          sessionId,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {unsealContainerId && (
        <UnsealConfirmModal
          planId={plan.id}
          containerId={unsealContainerId}
          containerNumber={
            containers.find((item) => item.id === unsealContainerId)?.orderContainer?.containerNo ??
            null
          }
          onClose={() => setUnsealContainerId(null)}
        />
      )}

      {resealContainerId && (
        <ResealModal
          planId={plan.id}
          containerId={resealContainerId}
          onClose={() => setResealContainerId(null)}
        />
      )}

      <CargoInspectionModal
        inspectionModal={inspectionModal}
        onClose={() => setInspectionModal(null)}
      />
    </div>
  );
};
