import React, { useMemo, useState, useEffect } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import EntityTable, {
  type EntityAction,
  type EntityColumn,
} from '@/shared/components/EntityTable';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';
import { useToast } from '@/shared/hooks/useToast';
import {
  useContainerList,
  useCreateContainer,
  useUpdateContainer,
  useDeleteContainer,
} from '@/features/containers/hooks/use-containers-query';
import { useContainerTypeList } from '@/features/containers/hooks/use-container-types-query';
import { ContainerFormModal } from './ContainerFormModal';
import type { Container } from '@/features/containers/types';
import type { ContainerFormValues } from '@/features/containers/schemas';
import { ContainerDetailModal } from '../container-detail/ContainerDetailModal';
import ContainerLifecycleCard from '../container-detail/ContainerLifecycleCard';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';
import {
  isCycleDisplayable,
  formatCycleSummary,
  normalizeCycleStatus,
} from '@/features/containers/utils/cycleStatus';

type FilterState = {
  number?: string;
  containerTypeCode?: string;
  cycleStatus?: string;
  hasActiveCycle?: 'with' | 'without';
};

const normalizeDisplayText = (value: unknown) => {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const lowered = text.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return null;
  return text;
};

const fuzzyMatch = (target: string, searchTerm: string): boolean => {
  if (!target || !searchTerm) return !searchTerm; // empty search matches all
  const normalizedTarget = target.toLowerCase().trim();
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  // Exact substring match (most common case - highest priority)
  if (normalizedTarget.includes(normalizedSearch)) {
    return true;
  }
  
  // Multi-word matching: all space-separated words must exist in target
  const words = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 1) {
    return words.every(word => normalizedTarget.includes(word));
  }
  
  // Fuzzy character matching: all characters from search appear in order in target
  let searchIndex = 0;
  for (let i = 0; i < normalizedTarget.length && searchIndex < normalizedSearch.length; i++) {
    if (normalizedTarget[i] === normalizedSearch[searchIndex]) {
      searchIndex++;
    }
  }
  
  return searchIndex === normalizedSearch.length;
};

export const ContainerListPage: React.FC = () => {
  const { can } = useAuth();
  const toast = useToast();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [detailModalContainerId, setDetailModalContainerId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    container: Container | null;
  }>({ open: false, mode: 'create', container: null });
  const [expandedContainerId, setExpandedContainerId] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({});

  const hasActiveFilters = appliedFilters.number || appliedFilters.containerTypeCode || appliedFilters.cycleStatus || appliedFilters.hasActiveCycle;

  const queryParams = useMemo(() => {
    if (hasActiveFilters) {
      // When filters are active, fetch all data for client-side filtering
      return {
        page: 1,
        itemsPerPage: 1000, // Large page size to get all/most data
        order: 'createdAt:DESC',
        cycle: true,
      };
    }
    // When no filters, use normal server-side pagination
    return {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      order: 'createdAt:DESC',
      cycle: true,
    };
  }, [hasActiveFilters, pagination.pageIndex, pagination.pageSize]);

  const { data, isLoading, isFetching, refetch } = useContainerList(queryParams);
  const allContainers = useMemo(() => data?.results ?? [], [data?.results]);
  const baseContainers = useMemo(() => {
    if (hasActiveFilters) {
      // When filters are active, use all fetched data
      return allContainers;
    }
    // When no filters, use normal paginated data
    return allContainers;
  }, [hasActiveFilters, allContainers]);
  const { data: containerTypesData } = useContainerTypeList();
  const containerTypes = useMemo(() => containerTypesData?.results ?? [], [containerTypesData?.results]);
  const createMutation = useCreateContainer();
  const updateMutation = useUpdateContainer();
  const deleteMutation = useDeleteContainer();

  const filterFields = useMemo(() => {
    const containerTypeOptions = containerTypes.map((ct) => ({
      value: ct.code,
      label: `${ct.code} — ${ct.size}${ct.description ? ` · ${ct.description}` : ''}`,
    }));

    const cycleStatusOptions = [
      { value: 'ACTIVE', label: 'ACTIVE' },
      { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
      { value: 'COMPLETED', label: 'COMPLETED' },
      { value: 'CLOSED', label: 'CLOSED' },
    ];

    const activeCycleOptions = [
      { value: 'with', label: 'With active cycle' },
      { value: 'without', label: 'Without active cycle' },
    ];

    return [
      {
        type: 'text' as const,
        name: 'number',
        label: 'Container Number',
        placeholder: 'e.g., MSCU6639871',
      },
      {
        type: 'select' as const,
        name: 'containerTypeCode',
        label: 'Container Type',
        options: containerTypeOptions,
        keyField: 'value',
        valueField: 'label',
        placeholder: 'Select type...',
      },
      {
        type: 'select' as const,
        name: 'cycleStatus',
        label: 'Cycle Status',
        options: cycleStatusOptions,
        keyField: 'value',
        valueField: 'label',
        placeholder: 'Select status...',
      },
      {
        type: 'select' as const,
        name: 'hasActiveCycle',
        label: 'Active Cycle',
        options: activeCycleOptions,
        keyField: 'value',
        valueField: 'label',
        placeholder: 'Any',
      },
    ];
  }, [containerTypes]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (hasActiveFilters && pagination.pageIndex !== 0) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }
  }, [hasActiveFilters, pagination.pageIndex]);

  const filteredResults = useMemo(() => {
    const normalizedFilterStatus = appliedFilters.cycleStatus
      ? normalizeCycleStatus(appliedFilters.cycleStatus)
      : null;
    const results = baseContainers;
    return results.filter((container) => {
      // Use fuzzy matching for container number search
      if (appliedFilters.number && !fuzzyMatch(container.number, appliedFilters.number)) {
        return false;
      }
      if (
        appliedFilters.containerTypeCode &&
        container.containerTypeCode !== appliedFilters.containerTypeCode
      ) {
        return false;
      }

      const cycle = container.currentCycle;
      const normalizedCycleStatus = normalizeCycleStatus(cycle?.status);
      if (normalizedFilterStatus && normalizedCycleStatus !== normalizedFilterStatus) {
        return false;
      }
      if (appliedFilters.hasActiveCycle) {
        const hasDisplayableCycle =
          isCycleDisplayable(cycle) && Boolean(formatCycleSummary(cycle, { fallback: null }));
        if (appliedFilters.hasActiveCycle === 'with' && !hasDisplayableCycle) {
          return false;
        }
        if (appliedFilters.hasActiveCycle === 'without' && hasDisplayableCycle) {
          return false;
        }
      }

      return true;
    });
  }, [baseContainers, appliedFilters]);

  // Apply pagination to filtered results when filters are active
  const paginatedResults = useMemo(() => {
    if (hasActiveFilters) {
      const startIndex = pagination.pageIndex * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      return filteredResults.slice(startIndex, endIndex);
    }
    // When no filters, data is already paginated from server
    return filteredResults;
  }, [filteredResults, pagination.pageIndex, pagination.pageSize, hasActiveFilters]);

  // Calculate total count based on filtered results when filters are active
  const totalCount = useMemo(() => {
    if (hasActiveFilters) {
      return filteredResults.length;
    }
    // When no filters, use server-provided total
    return data?.total ?? filteredResults.length;
  }, [hasActiveFilters, filteredResults.length, data?.total]);

  const canManage = can('container_management:write');
  const canView = can('container_management:read');

  const columns: EntityColumn<Container>[] = [
    {
      key: 'number',
      label: 'Container Number',
      sortable: true,
      render: (container) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{container.number}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {container.containerType?.code ?? container.containerTypeCode}
          </p>
        </div>
      ),
    },
    {
      key: 'activeCycle',
      label: 'Active Cycle',
      render: (container) => {
        const cycle = container.currentCycle;
        if (!cycle) {
          return <span className="text-sm text-gray-500 dark:text-gray-400">—</span>;
        }
        const operationMode = normalizeDisplayText(cycle.operationMode) ?? '—';
        const code = cycle.code ?? '—';
        const status = cycle.status ?? cycle.containerStatus ?? '—';
        const transactionCount = container.currentCycleTransactionCount ?? cycle.transactions?.length ?? 0;
        return (
          <div className="text-sm text-gray-900 dark:text-gray-100">
            <p className="font-medium">{code}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {operationMode} · {status} · {transactionCount} tx
            </p>
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (container) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {container.containerType?.size ?? '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
            {container.containerType?.description ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (container) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTimeForDisplay(container.createdAt)}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (container) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTimeForDisplay(container.updatedAt)}
        </span>
      ),
    },
  ];

  const actions: EntityAction<Container>[] = [
    {
      key: 'view',
      label: 'View details',
      icon: <Eye className="h-4 w-4" />,
      onClick: (container) => setDetailModalContainerId(container.id),
    },
    ...(canManage
      ? [
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit2 className="h-4 w-4" />,
          onClick: (container: Container) =>
            setModalState({ open: true, mode: 'edit', container }),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          variant: 'destructive' as const,
          onClick: async (container: Container) => {
            const confirmed = await toast.confirm(
              `Delete container ${container.number}?`,
            );
            if (!confirmed) return;
            try {
              await deleteMutation.mutateAsync(container.id);
              toast.success('Container deleted');
              refetch();
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : 'Failed to delete container',
              );
            }
          },
        },
      ]
      : []),
  ];

  const handleApplyFilter = (values: FilterValues) => {
    const nextFilters: FilterState = {
      number: typeof values.number === 'string' ? values.number : undefined,
      containerTypeCode:
        typeof values.containerTypeCode === 'string' ? values.containerTypeCode : undefined,
      cycleStatus: typeof values.cycleStatus === 'string' ? values.cycleStatus : undefined,
      hasActiveCycle:
        values.hasActiveCycle === 'with' || values.hasActiveCycle === 'without'
          ? values.hasActiveCycle
          : undefined,
    };

    setAppliedFilters(nextFilters);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleClearFilter = () => {
    setAppliedFilters({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleModalSubmit = async (values: ContainerFormValues) => {
    try {
      if (modalState.mode === 'create') {
        await createMutation.mutateAsync(values);
        toast.success('Container created');
      } else if (modalState.container) {
        await updateMutation.mutateAsync({ id: modalState.container.id, data: values });
        toast.success('Container updated');
      }
      setModalState({ open: false, mode: 'create', container: null });
      refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save container',
      );
    }
  };

  if (!canView) {
    return (
      <div className="p-10 text-center text-gray-600 dark:text-gray-300">
        You do not have permission to view containers.
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        <div className="flex-1 min-h-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
            <div className="flex-shrink-0 flex flex-col gap-4 p-4 border-b border-gray-200 dark:border-gray-700 md:flex-row md:items-start md:justify-between">
              <div className="w-full md:flex-1">
                <DynamicFilter
                  fields={filterFields}
                  onApplyFilter={handleApplyFilter}
                  onClear={handleClearFilter}
                  className="w-full"
                  buttonLabel="Filters"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start">
                <Button variant="outline" onClick={() => refetch()}>
                  Refresh
                </Button>
                {canManage && (
                  <Button
                    onClick={() => setModalState({ open: true, mode: 'create', container: null })}
                    className="whitespace-nowrap"
                  >
                    Add container
                  </Button>
                )}
              </div>
            </div>

            <EntityTable
              entities={paginatedResults}
              loading={isLoading}
              fetching={isFetching}
              error={null}
              entityName="Container"
              entityNamePlural="Containers"
              getId={(container) => container.id}
              columns={columns}
              actions={actions}
              renderExpandedRow={(container) => (
                <ContainerLifecycleCard
                  container={container}
                  activeCycle={container.currentCycle}
                  onClose={() => {
                    setExpandedContainerId(null);
                  }}
                />
              )}
              expandedEntityId={expandedContainerId}
              onEntityExpand={(container) => {
                const id = container?.id ?? null;
                if (expandedContainerId === id) {
                  setExpandedContainerId(null);
                } else {
                  setExpandedContainerId(id);
                }
              }}
              enableServerSidePagination={!hasActiveFilters}
              pagination={pagination}
              onPaginationChange={setPagination}
              totalCount={totalCount}
              className="flex-1"
              emptyStateMessage="No containers found"
            />

            {detailModalContainerId && (() => {
              const detailContainer = baseContainers.find((c) => c.id === detailModalContainerId);
              if (!detailContainer) return null;
              return (
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                  <ContainerLifecycleCard
                    container={detailContainer}
                    activeCycle={detailContainer.currentCycle}
                    onClose={() => {
                      setDetailModalContainerId(null);
                    }}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <ContainerFormModal
        isOpen={modalState.open}
        mode={modalState.mode}
        initialValues={
          modalState.container
            ? {
                number: modalState.container.number,
                containerTypeCode: modalState.container.containerTypeCode,
              }
            : undefined
        }
        containerTypes={containerTypes}
        onSubmit={handleModalSubmit}
        onClose={() => setModalState({ open: false, mode: 'create', container: null })}
        isSubmitting={modalState.mode === 'create' ? createMutation.isPending : updateMutation.isPending}
      />

      <ContainerDetailModal
        isOpen={Boolean(detailModalContainerId)}
        containerId={detailModalContainerId}
        onClose={() => {
          setDetailModalContainerId(null);
        }}
      />
    </div>
  );
};

export default ContainerListPage;
