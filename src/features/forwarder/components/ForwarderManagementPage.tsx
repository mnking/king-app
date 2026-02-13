import React, { useMemo, useState } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { ClipboardList, LayoutTemplate, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/shared/components/ui/Button';
import { useForwarders, useCreateForwarder, useUpdateForwarder, useForwarderStats } from '../hooks/use-forwarders-query';
import type { Forwarder } from '../types';
import EntityTable from '@/shared/components/EntityTable';
import ForwarderModal from './ForwarderModal';
import { DynamicFilter, type FilterValues } from '@/shared/components/DynamicFilter';
import { useAuth } from '@/features/auth/useAuth';

type StatCardProps = {
  title: string;
  hint: string;
  icon: React.ElementType;
  value?: React.ReactNode;
};

const StatCard: React.FC<StatCardProps> = ({ title, hint, icon: Icon, value = '—' }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{title}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
  </div>
);

const statusBadge = (status: Forwarder['status']) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  const normalized = status?.toUpperCase();
  if (normalized === 'ACTIVE') {
    return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200`;
  }
  return `${base} bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200`;
};

const contractBadge = (status: Forwarder['contractStatus']) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  const normalized = status?.toUpperCase();
  switch (normalized) {
    case 'ACTIVE':
      return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200`;
    case 'SUSPENDED':
      return `${base} bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200`;
    case 'EXPIRED':
      return `${base} bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200`;
    default:
      return `${base} bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200`;
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const ForwarderManagementPage: React.FC = () => {
  type ModalMode = 'create' | 'edit' | 'view';
  const { can } = useAuth();
  const canWriteForwarders = can?.('forwarder_management:write') ?? false;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [activeForwarder, setActiveForwarder] = useState<Forwarder | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
    };

    if (typeof filterValues.name === 'string' && filterValues.name.trim() !== '') {
      params.name = filterValues.name.trim();
    }
    if (typeof filterValues.type === 'string' && filterValues.type !== 'all') {
      params.type = filterValues.type;
    }
    if (typeof filterValues.status === 'string' && filterValues.status !== 'all') {
      params.status = filterValues.status;
    }
    if (
      typeof filterValues.contractStatus === 'string' &&
      filterValues.contractStatus !== 'all'
    ) {
      params.contractStatus = filterValues.contractStatus;
    }

    return params;
  }, [filterValues, pagination]);

  const { data, isLoading, isFetching, isError, error } = useForwarders(queryParams);
  const { data: statsData, isLoading: statsLoading } = useForwarderStats();
  const createForwarder = useCreateForwarder();
  const updateForwarder = useUpdateForwarder();

  const forwarders = data?.results ?? [];
  const totalCount = data?.total ?? 0;

  const stats = useMemo(() => {
    if (!statsData) {
      return [
        {
          title: 'Total forwarders',
          hint: 'All forwarders on record.',
          icon: Users,
          value: statsLoading ? '...' : '—',
        },
        {
          title: 'Active forwarders',
          hint: 'Forwarders currently active.',
          icon: ClipboardList,
          value: statsLoading ? '...' : '—',
        },
        {
          title: 'Active contracts',
          hint: 'Forwarders with active contracts.',
          icon: LayoutTemplate,
          value: statsLoading ? '...' : '—',
        },
      ];
    }

    return [
      {
        title: 'Total forwarders',
        hint: 'All forwarders on record.',
        icon: Users,
        value: statsData.totalForwarders ?? '—',
      },
      {
        title: 'Active forwarders',
        hint: 'Forwarders currently active.',
        icon: ClipboardList,
        value: statsData.totalActiveForwarders ?? '—',
      },
      {
        title: 'Active contracts',
        hint: 'Forwarders with active contracts.',
        icon: LayoutTemplate,
        value: statsData.totalActiveContracts ?? '—',
      },
    ];
  }, [statsData, statsLoading]);

  const filterFields = useMemo(
    () => [
      {
        type: 'text' as const,
        name: 'name',
        label: 'Name',
        placeholder: 'Search by name',
      },
      {
        type: 'select' as const,
        name: 'type',
        label: 'Type',
        options: [
          { value: 'all', label: 'All' },
          { value: 'Forwarder', label: 'Forwarder' },
          { value: 'NVOCC', label: 'NVOCC' },
          { value: 'NORMAL', label: 'Normal' },
        ],
        keyField: 'value' as const,
        valueField: 'label' as const,
        placeholder: 'All types',
      },
      {
        type: 'select' as const,
        name: 'status',
        label: 'Status',
        options: [
          { value: 'all', label: 'All' },
          { value: 'Active', label: 'Active' },
          { value: 'Inactive', label: 'Inactive' },
        ],
        keyField: 'value' as const,
        valueField: 'label' as const,
        placeholder: 'All statuses',
      },
      {
        type: 'select' as const,
        name: 'contractStatus',
        label: 'Contract Status',
        options: [
          { value: 'all', label: 'All' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'EXPIRED', label: 'Expired' },
          { value: 'SUSPENDED', label: 'Suspended' },
        ],
        keyField: 'value' as const,
        valueField: 'label' as const,
        placeholder: 'All contract statuses',
      },
    ],
    [],
  );

  const columns = useMemo(
    () => [
      {
        key: 'code',
        label: 'Code',
        render: (item: Forwarder) => <span className="font-semibold text-gray-900 dark:text-white">{item.code}</span>,
        sortable: true,
      },
      {
        key: 'name',
        label: 'Name',
        render: (item: Forwarder) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{item.type || 'Forwarder'}</div>
          </div>
        ),
        sortable: true,
      },
      {
        key: 'status',
        label: 'Status',
        render: (item: Forwarder) => <span className={statusBadge(item.status)}>{item.status}</span>,
        sortable: true,
      },
      {
        key: 'contractStatus',
        label: 'Contract',
        render: (item: Forwarder) => (
          <span className={contractBadge(item.contractStatus)}>
            {item.contractStatus ? item.contractStatus.toUpperCase() : 'N/A'}
          </span>
        ),
        sortable: true,
      },
      {
        key: 'contractExpireDate',
        label: 'Contract Expiry',
        render: (item: Forwarder) => <span className="text-gray-700 dark:text-gray-200">{formatDate(item.contractExpireDate)}</span>,
        sortable: true,
      },
      {
        key: 'contactInfo',
        label: 'Contact Info',
        render: (item: Forwarder) => <span className="text-gray-700 dark:text-gray-200">{item.contactInfo || '—'}</span>,
      },
      {
        key: 'note',
        label: 'Note',
        render: (item: Forwarder) => <span className="text-gray-600 dark:text-gray-300">{item.note || '—'}</span>,
      },
    ],
    [],
  );

  const openModal = (mode: ModalMode, forwarder?: Forwarder) => {
    if (mode !== 'view' && !canWriteForwarders) {
      toast.error('You do not have permission to modify forwarders.');
      return;
    }
    setModalMode(mode);
    setActiveForwarder(forwarder ?? null);
    setIsModalOpen(true);
  };

  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues(values);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleClearFilter = () => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              hint={stat.hint}
              icon={stat.icon}
              value={stat.value}
            />
          ))}
        </div>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Forwarder Table
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Directory & status
            </h2>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <DynamicFilter
            fields={filterFields}
            onApplyFilter={handleApplyFilter}
            onClear={handleClearFilter}
            buttonLabel="Filters"
          />
          <Button
            size="sm"
            onClick={() => openModal('create')}
            className="sm:ml-auto min-w-[9.5rem] justify-center"
            disabled={!canWriteForwarders}
          >
            Add forwarder
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl bg-white dark:border-gray-700 dark:bg-gray-800">
          <EntityTable<Forwarder>
            entities={forwarders}
            loading={isLoading}
            fetching={isFetching && !isLoading}
            error={isError ? (error instanceof Error ? error.message : 'Failed to load forwarders') : null}
            entityName="forwarder"
            entityNamePlural="forwarders"
            getId={(item) => item.id}
            columns={columns}
            actions={[
              {
                key: 'view',
                label: 'View',
                onClick: (item) => openModal('view', item),
              },
              {
                key: 'edit',
                label: 'Edit',
                onClick: (item) => openModal('edit', item),
                disabled: () => !canWriteForwarders,
              },
            ]}
            enablePagination={true}
            enableServerSidePagination={true}
            totalCount={totalCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            initialPageSize={pagination.pageSize}
            onCreateNew={() => openModal('create')}
            canCreate={canWriteForwarders}
            emptyStateMessage="No forwarders available yet. Populate mock data or connect to the real API."
          />
        </div>
      </section>

      <ForwarderModal
        open={isModalOpen}
        mode={modalMode}
        forwarder={activeForwarder}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onSave={async (payload) => {
          if (!canWriteForwarders) {
            toast.error('You do not have permission to modify forwarders.');
            return;
          }
          try {
            if (modalMode === 'edit' && activeForwarder) {
              await updateForwarder.mutateAsync({ id: activeForwarder.id, data: payload });
              toast.success('Forwarder updated');
            } else {
              await createForwarder.mutateAsync(payload);
              toast.success('Forwarder created');
            }
            setIsModalOpen(false);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save forwarder');
          }
        }}
        isSaving={createForwarder.isPending || updateForwarder.isPending}
      />
    </div>
  );
};

export default ForwarderManagementPage;
