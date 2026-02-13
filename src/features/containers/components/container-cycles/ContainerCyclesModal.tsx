import React, { useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { CheckCircle, RotateCcw } from 'lucide-react';
import EntityTable, {
  type EntityAction,
  type EntityColumn,
} from '@/shared/components/EntityTable';
import { Button } from '@/shared/components/ui/Button';
import { useToast } from '@/shared/hooks/useToast';
import { useAuth } from '@/features/auth/useAuth';
import {
  useContainerCycleList,
  useContainerCycles,
} from '@/features/containers/hooks/use-container-cycles';
import { ContainerCycleFormModal } from './ContainerCycleFormModal';
import type { ContainerCycle } from '@/features/containers/types';
import type {
  ContainerCycleFormValues,
  ContainerCycleEndFormValues,
} from '@/features/containers/schemas';

interface ContainerCyclesModalProps {
  isOpen: boolean;
  containerNumber: string | null;
  onClose: () => void;
}

type ModalState = {
  open: boolean;
  mode: 'create' | 'end';
  cycle: ContainerCycle | null;
};

export const ContainerCyclesModal: React.FC<ContainerCyclesModalProps> = ({
  isOpen,
  containerNumber,
  onClose,
}) => {
  const toast = useToast();
  const { can } = useAuth();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: 'create',
    cycle: null,
  });

  const canManage = can('container_management:write');
  const params = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      order: 'createdAt:DESC',
      containerNumber: containerNumber ?? undefined,
    }),
    [containerNumber, pagination],
  );

  const cycleQuery = useContainerCycleList(params);
  const cycleCrud = useContainerCycles();

  const columns: EntityColumn<ContainerCycle>[] = [
    {
      key: 'code',
      label: 'Cycle',
      render: (cycle) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {cycle.code}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {cycle.containerNumber}
          </p>
        </div>
      ),
    },
    {
      key: 'operationMode',
      label: 'Mode',
      render: (cycle) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {cycle.operationMode ?? '—'}
        </span>
      ),
    },
    {
      key: 'startEnd',
      label: 'Start / End',
      render: (cycle) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p>Start: {cycle.startEvent}</p>
          <p>End: {cycle.endEvent ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (cycle) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            cycle.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {cycle.status}
        </span>
      ),
    },
  ];

  const actions: EntityAction<ContainerCycle>[] = canManage
    ? [
        {
          key: 'end',
          label: 'End Cycle',
          icon: <CheckCircle className="h-4 w-4" />,
          disabled: (cycle) => !cycle.isActive,
          onClick: (cycle) =>
            setModalState({ open: true, mode: 'end', cycle }),
        },
        {
          key: 'restart',
          label: 'Restart Cycle',
          icon: <RotateCcw className="h-4 w-4" />,
          disabled: (cycle) => cycle.isActive,
          onClick: (cycle) =>
            setModalState({
              open: true,
              mode: 'create',
              cycle: {
                ...cycle,
                code: `${cycle.containerNumber}-${Date.now()}`,
              },
            }),
        },
      ]
    : [];

  const handleSubmit = async (
    values: ContainerCycleFormValues | ContainerCycleEndFormValues,
  ) => {
    try {
      if (modalState.mode === 'create') {
        await cycleCrud.createEntity(values as ContainerCycleFormValues);
        toast.success('Cycle created');
      } else if (modalState.cycle) {
        await cycleCrud.updateEntity(
          modalState.cycle.id,
          values as ContainerCycleEndFormValues,
        );
        toast.success('Cycle ended');
      }
      cycleQuery.refetch();
      setModalState({ open: false, mode: 'create', cycle: null });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update cycle');
    }
  };

  if (!isOpen) {
    return null;
  }

  const isActiveCycle = cycleQuery.data?.results?.find((cycle) => cycle.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cycles</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {containerNumber ? `Container ${containerNumber}` : 'Container Cycles'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setModalState({ open: true, mode: 'create', cycle: null })
                }
              >
                New cycle
              </Button>
            )}
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {containerNumber && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <p>
                Active cycle:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-50">
                  {isActiveCycle ? isActiveCycle.code : 'None'}
                </span>
              </p>
              <p>
                Status:{' '}
                <span className="font-medium">
                  {isActiveCycle ? isActiveCycle.status : 'Not running'}
                </span>
              </p>
            </div>
          )}
          <EntityTable
            entities={cycleQuery.data?.results ?? []}
            loading={cycleQuery.isLoading}
            fetching={cycleQuery.isFetching}
            error={null}
            entityName="Cycle"
            entityNamePlural="Cycles"
            getId={(cycle) => cycle.id}
            columns={columns}
            actions={actions}
            enableServerSidePagination
            pagination={pagination}
            onPaginationChange={setPagination}
            totalCount={cycleQuery.data?.total ?? 0}
            emptyStateMessage="No cycles found"
          />
        </div>
      </div>
      {canManage && (
        <ContainerCycleFormModal
          isOpen={modalState.open}
          onClose={() => setModalState({ open: false, mode: 'create', cycle: null })}
          mode={modalState.mode}
          initialValues={
            modalState.mode === 'create'
              ? {
                  containerNumber:
                    modalState.cycle?.containerNumber ?? containerNumber ?? '',
                  code: modalState.cycle?.code,
                  operationMode: modalState.cycle?.operationMode,
                  startEvent: modalState.cycle?.startEvent,
                  cargoLoading: modalState.cycle?.cargoLoading,
                  customsStatus: modalState.cycle?.customsStatus,
                  condition: modalState.cycle?.condition,
                  sealNumber: modalState.cycle?.sealNumber ?? undefined,
                  containerStatus: modalState.cycle?.containerStatus,
                  status: modalState.cycle?.status,
                }
              : {
                  endEvent: modalState.cycle?.endEvent ?? undefined,
                  status: modalState.cycle?.status ?? undefined,
                }
          }
          onSubmit={handleSubmit}
          isSubmitting={cycleCrud.isCreating || cycleCrud.isUpdating}
        />
      )}
    </div>
  );
};
