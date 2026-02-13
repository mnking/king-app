import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useExportPlans, fetchExportOrderById } from '@/features/stuffing-planning';
import type {
  ExportOrder,
  ExportPlan,
  ExportPlanContainer,
  ExportPlanStatus,
} from '@/features/stuffing-planning';

import { ContainerSelectionList } from './ContainerSelectionList';
import { StuffingContainerDetail } from './StuffingContainerDetail';

const FLOW_NAME = 'stuffingWarehouse';

type ContainerGroup = {
  plan: ExportPlan;
  containers: ExportPlanContainer[];
};

const getEligibleContainers = (plan: ExportPlan) =>
  (plan.containers ?? []).filter(
    (container) =>
      container.status === 'IN_PROGRESS' || container.status === 'STUFFED',
  );

const normalizeTimestamp = (value?: string | null): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export const StuffingExecutionWorkspace = () => {
  const [planStatus, setPlanStatus] = useState<ExportPlanStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedContainer, setSelectedContainer] = useState<{
    planId: string;
    containerId: string;
  } | null>(null);

  const plansQuery = useExportPlans({
    page: 1,
    itemsPerPage: 200,
    orderBy: 'createdAt',
    orderDir: 'desc',
    ...(planStatus !== 'all' ? { status: planStatus } : {}),
  });

  const rawPlans = useMemo(
    () => plansQuery.data?.results ?? [],
    [plansQuery.data?.results],
  );
  const allGroups = useMemo<ContainerGroup[]>(() => {
    const groups = rawPlans
      .map((plan) => {
        const containers = getEligibleContainers(plan);
        return { plan, containers };
      })
      .filter((group) => group.containers.length > 0);
    return groups;
  }, [rawPlans]);

  const visibleGroups = useMemo(
    () =>
      planFilter === 'all'
        ? allGroups
        : allGroups.filter((group) => group.plan.id === planFilter),
    [allGroups, planFilter],
  );

  const planOptions = useMemo(
    () =>
      allGroups.map((group) => ({
        value: group.plan.id,
        label: group.plan.code ?? group.plan.id,
      })),
    [allGroups],
  );

  useEffect(() => {
    if (planFilter === 'all') return;
    const stillValid = planOptions.some((option) => option.value === planFilter);
    if (!stillValid) {
      setPlanFilter('all');
    }
  }, [planFilter, planOptions]);

  const exportOrderQueries = useQueries({
    queries: visibleGroups.map((group) => ({
      queryKey: ['exportOrders', 'detail', group.plan.exportOrderId],
      queryFn: () => fetchExportOrderById(group.plan.exportOrderId),
      enabled: Boolean(group.plan.exportOrderId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const exportOrdersByPlanId = useMemo(() => {
    const map: Record<string, ExportOrder | null> = {};
    visibleGroups.forEach((group, index) => {
      map[group.plan.id] = exportOrderQueries[index]?.data ?? null;
    });
    return map;
  }, [visibleGroups, exportOrderQueries]);

  const sortedGroups = useMemo(() => {
    const groups = [...visibleGroups];
    groups.sort((a, b) => {
      const aEtd = normalizeTimestamp(
        exportOrdersByPlanId[a.plan.id]?.bookingConfirmation?.etd ?? null,
      );
      const bEtd = normalizeTimestamp(
        exportOrdersByPlanId[b.plan.id]?.bookingConfirmation?.etd ?? null,
      );
      if (aEtd === null && bEtd === null) return 0;
      if (aEtd === null) return 1;
      if (bEtd === null) return -1;
      return aEtd - bEtd;
    });
    return groups;
  }, [exportOrdersByPlanId, visibleGroups]);

  useEffect(() => {
    if (!selectedContainer && sortedGroups.length > 0) {
      const firstGroup = sortedGroups[0];
      const firstContainer = firstGroup?.containers[0];
      if (firstContainer) {
        setSelectedContainer({
          planId: firstGroup.plan.id,
          containerId: firstContainer.id,
        });
      }
    }
  }, [selectedContainer, sortedGroups]);

  useEffect(() => {
    if (!selectedContainer) return;
    const exists = sortedGroups.some(
      (group) =>
        group.plan.id === selectedContainer.planId &&
        group.containers.some((container) => container.id === selectedContainer.containerId),
    );
    if (!exists) {
      setSelectedContainer(null);
    }
  }, [selectedContainer, sortedGroups]);

  const selectedGroup = selectedContainer
    ? sortedGroups.find((group) => group.plan.id === selectedContainer.planId) ?? null
    : null;
  const selectedPlan = selectedGroup?.plan ?? null;
  const selectedContainerItem = selectedGroup?.containers.find(
    (container) => container.id === selectedContainer?.containerId,
  );

  if (plansQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-100 dark:bg-gray-950">
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full lg:w-[420px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-0">
          <ContainerSelectionList
            flowName={FLOW_NAME}
            groups={sortedGroups}
            exportOrdersByPlanId={exportOrdersByPlanId}
            selectedContainer={selectedContainer}
            onSelectContainer={(planId, containerId) =>
              setSelectedContainer({ planId, containerId })
            }
            planOptions={planOptions}
            planStatus={planStatus}
            onPlanStatusChange={setPlanStatus}
            planFilter={planFilter}
            onPlanFilterChange={setPlanFilter}
            isLoading={plansQuery.isFetching}
            error={plansQuery.error ? (plansQuery.error as Error).message : null}
            onRefresh={() => plansQuery.refetch()}
          />
        </aside>
        <section className="flex-1 min-h-0 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-6">
          <div className="mx-auto w-full max-w-5xl">
            <StuffingContainerDetail
              flowName={FLOW_NAME}
              plan={selectedPlan}
              container={selectedContainerItem ?? null}
              exportOrder={
                selectedPlan ? exportOrdersByPlanId[selectedPlan.id] ?? null : null
              }
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default StuffingExecutionWorkspace;
