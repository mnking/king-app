import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { PaginationState } from '@tanstack/react-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import type { FilterValues } from '@/shared/components/DynamicFilter';
import { useAuth } from '@/features/auth/useAuth';
import {
  useCreateInventoryPlanCheck,
  useDeleteInventoryPlanCheck,
  useInventoryPlanChecks,
  useStartInventoryPlanCheck,
  useUpdateInventoryPlanCheck,
} from '../hooks/use-inventory-checks-query';
import OpenPlanChecksTable from './OpenPlanChecksTable';
import DonePlanChecksTable from './DonePlanChecksTable';
import InventoryPlanModal, { type InventoryPlanModalMode } from './InventoryPlanModal';
import type { InventoryPlanCheck } from '../types';
import type { InventoryPlanFormData } from '../schemas';

const paginate = <T,>(rows: T[], pagination: PaginationState) => {
  const start = pagination.pageIndex * pagination.pageSize;
  return rows.slice(start, start + pagination.pageSize);
};

const InventoryCheckManagementPage: React.FC = () => {
  const { can } = useAuth();
  const canWriteInventoryChecks = can?.('inventory_check_management:write') ?? false;
  const { data, isLoading, isFetching, isError, error } =
    useInventoryPlanChecks();
  const [activeTab, setActiveTab] = useState<'open' | 'done'>('open');
  const createPlanMutation = useCreateInventoryPlanCheck();
  const updatePlanMutation = useUpdateInventoryPlanCheck();
  const deletePlanMutation = useDeleteInventoryPlanCheck();
  const startPlanMutation = useStartInventoryPlanCheck();
  const [closedFilterValues, setClosedFilterValues] = useState<FilterValues>(
    {},
  );
  const [openPagination, setOpenPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [donePagination, setDonePagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<InventoryPlanModalMode>('create');
  const [activePlan, setActivePlan] = useState<InventoryPlanCheck | null>(null);
  const [deletePlanTarget, setDeletePlanTarget] =
    useState<InventoryPlanCheck | null>(null);

  const inventoryChecks = useMemo(
    () => data?.results ?? [],
    [data?.results],
  );

  const workingStatuses = useMemo(
    () => new Set<InventoryPlanCheck['status']>([
      'RECORDING',
      'RECORDED',
      'EXPLAINED',
      'ADJUSTING',
    ]),
    [],
  );

  const hasWorkingPlan = useMemo(
    () => inventoryChecks.some((check) => workingStatuses.has(check.status)),
    [inventoryChecks, workingStatuses],
  );

  const openChecks = useMemo(
    () =>
      inventoryChecks.filter(
        (check) => check.status !== 'DONE' && check.status !== 'CANCELED',
      ),
    [inventoryChecks],
  );
  const closedQuery = useInventoryPlanChecks(
    closedFilterValues as Parameters<typeof useInventoryPlanChecks>[0],
    {
      enabled: activeTab === 'done' || Object.keys(closedFilterValues).length > 0,
    },
  );
  const closedChecks = useMemo(
    () =>
      (closedQuery.data?.results ?? []).filter(
        (check) => check.status === 'DONE' || check.status === 'CANCELED',
      ),
    [closedQuery.data?.results],
  );

  const openRows = useMemo(
    () => paginate(openChecks, openPagination),
    [openChecks, openPagination],
  );
  const doneRows = useMemo(
    () => paginate(closedChecks, donePagination),
    [closedChecks, donePagination],
  );

  const errorMessage = isError
    ? error instanceof Error
      ? error.message
      : 'Failed to load inventory plan checks'
    : null;

  const openModal = (
    mode: InventoryPlanModalMode,
    plan: InventoryPlanCheck | null,
  ) => {
    if (mode !== 'view' && !canWriteInventoryChecks) {
      toast.error('You do not have permission to modify inventory checks.');
      return;
    }
    setModalMode(mode);
    setActivePlan(plan);
    setIsModalOpen(true);
  };

  const handleCreate = () => openModal('create', null);

  const handleView = (plan: InventoryPlanCheck) => openModal('view', plan);

  const handleEdit = (plan: InventoryPlanCheck) => {
    if (!canWriteInventoryChecks) {
      toast.error('You do not have permission to modify inventory checks.');
      return;
    }
    if (plan.status !== 'CREATED') {
      return;
    }
    openModal('edit', plan);
  };

  const handleSave = async (payload: InventoryPlanFormData) => {
    if (!canWriteInventoryChecks) {
      toast.error('You do not have permission to modify inventory checks.');
      return;
    }
    if (modalMode === 'edit' && activePlan) {
      await updatePlanMutation.mutateAsync({ id: activePlan.id, payload });
      toast.success('Plan updated');
    } else {
      await createPlanMutation.mutateAsync(payload);
      toast.success('Plan created');
    }
    setIsModalOpen(false);
  };

  const handleStartCheck = async (plan: InventoryPlanCheck) => {
    if (!canWriteInventoryChecks) {
      toast.error('You do not have permission to modify inventory checks.');
      return;
    }
    if (hasWorkingPlan || plan.status !== 'CREATED') {
      return;
    }
    const updated = await startPlanMutation.mutateAsync(plan.id);
    if (updated) {
      setActivePlan(updated);
      toast.success('Plan check started');
    }
  };

  const handleDelete = async (plan: InventoryPlanCheck) => {
    if (!canWriteInventoryChecks) {
      toast.error('You do not have permission to modify inventory checks.');
      return;
    }
    if (plan.status !== 'CREATED') {
      return;
    }
    setDeletePlanTarget(plan);
  };

  const confirmDelete = async () => {
    if (!deletePlanTarget) {
      return;
    }
    if (!canWriteInventoryChecks) {
      toast.error('You do not have permission to modify inventory checks.');
      return;
    }
    await deletePlanMutation.mutateAsync(deletePlanTarget.id);
    toast.success('Plan deleted');
    setDeletePlanTarget(null);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as 'open' | 'done')}
      className="h-full flex flex-col bg-gray-100 dark:bg-gray-900"
    >
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList
          variant="underline"
          className="bg-transparent border-0 rounded-none shadow-none p-0"
        >
          <TabsTrigger value="open" variant="underline">
            Open Sessions
          </TabsTrigger>
          <TabsTrigger value="done" variant="underline">
            Closed Sessions
          </TabsTrigger>
        </TabsList>
        <Button
          size="sm"
          className="sm:ml-auto min-w-[8.5rem] justify-center"
          onClick={handleCreate}
          disabled={!canWriteInventoryChecks}
        >
          Create session
        </Button>
      </div>

      <TabsContent value="open" className="flex-1 min-h-0 mt-0 p-2">
        <OpenPlanChecksTable
          rows={openRows}
          loading={isLoading}
          fetching={isFetching}
          error={errorMessage}
          pagination={openPagination}
          onPaginationChange={setOpenPagination}
          totalCount={openChecks.length}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canWrite={canWriteInventoryChecks}
        />
      </TabsContent>

      <TabsContent value="done" className="flex-1 min-h-0 mt-0 p-2">
        <DonePlanChecksTable
          rows={doneRows}
          loading={closedQuery.isLoading}
          fetching={closedQuery.isFetching}
          error={
            closedQuery.isError
              ? closedQuery.error instanceof Error
                ? closedQuery.error.message
                : 'Failed to load plan checks'
              : null
          }
          pagination={donePagination}
          onPaginationChange={setDonePagination}
          totalCount={closedChecks.length}
          onView={handleView}
          filterValues={closedFilterValues}
          onApplyFilter={(values) => {
            setClosedFilterValues(values);
            setDonePagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          onClearFilter={() => {
            setClosedFilterValues({});
            setDonePagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        />
      </TabsContent>

      <InventoryPlanModal
        open={isModalOpen}
        mode={modalMode}
        plan={activePlan}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        hasWorkingPlan={hasWorkingPlan}
        onStartCheck={handleStartCheck}
        isSaving={createPlanMutation.isPending || updatePlanMutation.isPending}
        canWrite={canWriteInventoryChecks}
      />

      {deletePlanTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-md">
            <ConfirmDialog
              open
              message="Delete plan check?"
              description="This action cannot be undone."
              confirmLabel="Delete"
              cancelLabel="Cancel"
              intent="danger"
              onConfirm={confirmDelete}
              onCancel={() => setDeletePlanTarget(null)}
            />
          </div>
        </div>
      )}
    </Tabs>
  );
};

export default InventoryCheckManagementPage;
