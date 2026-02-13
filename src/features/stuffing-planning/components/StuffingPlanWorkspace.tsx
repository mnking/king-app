import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { StuffingPlanDetail } from './StuffingPlanDetail';
import { StuffingPlanList } from './StuffingPlanList';
import {
  useDeleteExportPlan,
  useExportPlan,
  useExportPlans,
} from '../hooks';
import type { ExportPlan, ExportPlanQueryParams } from '../types';
import { toastAdapter } from '@/shared/services/toast';

export const StuffingPlanWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    searchParams.get('planId'),
  );

  const queryParams = useMemo<ExportPlanQueryParams>(
    () => ({
      page: 1,
      itemsPerPage: 100,
      orderBy: 'createdAt',
      orderDir: 'desc',
    }),
    [],
  );

  const {
    data: plansResponse,
    isLoading,
    error,
    refetch,
  } = useExportPlans(queryParams);

  const plans = useMemo(() => plansResponse?.results ?? [], [plansResponse?.results]);
  const activePlans = useMemo(
    () => plans.filter((plan) => plan.status === 'CREATED' || plan.status === 'IN_PROGRESS'),
    [plans],
  );

  useEffect(() => {
    const planId = searchParams.get('planId');
    if (planId && planId !== selectedPlanId) {
      setSelectedPlanId(planId);
    }
  }, [searchParams, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlanId && activePlans.length > 0) {
      setSelectedPlanId(activePlans[0].id);
    }
  }, [activePlans, selectedPlanId]);

  useEffect(() => {
    const currentPlanId = searchParams.get('planId');
    if (selectedPlanId && selectedPlanId !== currentPlanId) {
      const next = new URLSearchParams(searchParams);
      next.set('planId', selectedPlanId);
      setSearchParams(next, { replace: true });
    }
    if (!selectedPlanId && currentPlanId) {
      const next = new URLSearchParams(searchParams);
      next.delete('planId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, selectedPlanId, setSearchParams]);

  const selectedPlanFromList = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const {
    data: selectedPlanDetail,
    isLoading: isPlanLoading,
    error: planError,
  } = useExportPlan(selectedPlanId ?? '', { enabled: Boolean(selectedPlanId) });

  const deletePlanMutation = useDeleteExportPlan();

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const next = new URLSearchParams(searchParams);
    next.set('planId', planId);
    setSearchParams(next, { replace: true });
  };

  const handleDeletePlan = async (plan: ExportPlan) => {
    const canDelete =
      plan.status === 'CREATED' && (plan.containers?.length ?? 0) === 0;

    if (!canDelete) {
      toast.error('Only empty CREATED plans can be deleted.');
      return;
    }

    const confirmed = await toastAdapter.confirm(
      'Delete stuffing plan? This action cannot be undone.',
      { intent: 'danger' },
    );

    if (!confirmed) return;

    try {
      await deletePlanMutation.mutateAsync(plan.id);
      if (selectedPlanId === plan.id) {
        const nextPlanId =
          activePlans.find((item) => item.id !== plan.id)?.id ?? null;
        setSelectedPlanId(nextPlanId);
        const next = new URLSearchParams(searchParams);
        if (nextPlanId) {
          next.set('planId', nextPlanId);
        } else {
          next.delete('planId');
        }
        setSearchParams(next, { replace: true });
      }
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="h-full flex bg-gray-100 dark:bg-gray-900 relative">
      <div className="w-full md:w-[360px] border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0 overflow-hidden">
        <StuffingPlanList
          plans={activePlans}
          selectedPlanId={selectedPlanId}
          isLoading={isLoading}
          error={error ? (error as Error).message : null}
          onSelectPlan={handleSelectPlan}
          onDeletePlan={handleDeletePlan}
          onRefresh={() => refetch()}
        />
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <StuffingPlanDetail
          plan={selectedPlanDetail ?? selectedPlanFromList}
          isLoading={isPlanLoading}
          error={planError ? (planError as Error).message : null}
        />
      </div>
    </div>
  );
};

export default StuffingPlanWorkspace;
