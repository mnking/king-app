import React, { useMemo, useState } from 'react';
import EntityTable, { type EntityColumn } from '@/shared/components/EntityTable';
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';
import { useToast } from '@/shared/hooks/useToast';
import {
  useContainerTypeList,
  useContainerTypes,
} from '@/features/containers/hooks/use-container-types-query';
import { ContainerTypeFormModal } from './ContainerTypeFormModal';
import type { ContainerType } from '@/features/containers/types';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';

export const ContainerTypesPage: React.FC = () => {
  const toast = useToast();
  const { can } = useAuth();
  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    type: ContainerType | null;
  }>({ open: false, mode: 'create', type: null });
  const typeListQuery = useContainerTypeList();
  const typeCrud = useContainerTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterField, setDateFilterField] = useState<'createdAt' | 'updatedAt'>('updatedAt');
  const [dateFilterRange, setDateFilterRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const canManage = can('container_management:write');

  const columns: EntityColumn<ContainerType>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      searchable: true,
      render: (type) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{type.code}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{type.size}</p>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      searchable: true,
      render: (type) => (
        <p className="text-sm text-gray-700 dark:text-gray-300">{type.description ?? '—'}</p>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (type) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTimeForDisplay(type.createdAt)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        new Date(rowA.original.createdAt).getTime() - new Date(rowB.original.createdAt).getTime(),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (type) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTimeForDisplay(type.updatedAt)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        new Date(rowA.original.updatedAt).getTime() - new Date(rowB.original.updatedAt).getTime(),
    },
  ];

  if (canManage) {
    columns.push({
      key: 'actions',
      label: '',
   
    });
  }

  const handleSave = async (values: any) => {
    try {
      if (modalState.mode === 'create') {
        await typeCrud.createEntity(values);
        toast.success('Container type created');
      } else if (modalState.type) {
        await typeCrud.updateEntity(modalState.type.code, values);
        toast.success('Container type updated');
      }
      typeListQuery.refetch();
      setModalState({ open: false, mode: 'create', type: null });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save type');
    }
  };

  const data = useMemo(
    () => typeListQuery.data?.results ?? [],
    [typeListQuery.data?.results],
  );
  const filteredData = useMemo(() => {
    if (!dateFilterRange.from && !dateFilterRange.to) {
      return data;
    }

    const fromDate = dateFilterRange.from ? new Date(dateFilterRange.from) : null;
    const toDate = dateFilterRange.to ? new Date(dateFilterRange.to) : null;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    return data.filter((type) => {
      const value = new Date(type[dateFilterField]);
      if (Number.isNaN(value.getTime())) return false;
      if (fromDate && value < fromDate) return false;
      if (toDate && value > toDate) return false;
      return true;
    });
  }, [data, dateFilterField, dateFilterRange]);

  const handleResetFilters = () =>
    setDateFilterRange({
      from: '',
      to: '',
    });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Container Types
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage ISO equipment codes and metadata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters((prev) => !prev)}
            aria-expanded={showFilters}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          {canManage && (
            <Button onClick={() => setModalState({ open: true, mode: 'create', type: null })}>
              New Type
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Filter Field
            </label>
            <select
              value={dateFilterField}
              onChange={(event) =>
                setDateFilterField(event.target.value as 'createdAt' | 'updatedAt')
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="updatedAt">Updated At</option>
              <option value="createdAt">Created At</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              From
            </label>
            <input
              type="date"
              value={dateFilterRange.from}
              onChange={(event) =>
                setDateFilterRange((prev) => ({ ...prev, from: event.target.value }))
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              To
            </label>
            <input
              type="date"
              value={dateFilterRange.to}
              onChange={(event) =>
                setDateFilterRange((prev) => ({ ...prev, to: event.target.value }))
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-col gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={handleResetFilters}
              disabled={!dateFilterRange.from && !dateFilterRange.to}
            >
              Clear Dates
            </Button>
          </div>
        </div>
      )}

      <EntityTable
        entities={filteredData}
        loading={typeListQuery.isLoading}
        fetching={typeListQuery.isFetching}
        error={null}
        entityName="Container Type"
        entityNamePlural="Container Types"
        getId={(type) => type.id ?? type.code}
        columns={columns}
        actions={[]}
        emptyStateMessage="No container types found"
        searchPlaceholder="Search by code, size or description"
        searchFilter={(type, term) => {
          const normalized = term.trim().toLowerCase();
          if (!normalized) return true;
          return (
            type.code.toLowerCase().includes(normalized) ||
            (type.size ?? '').toLowerCase().includes(normalized) ||
            (type.description ?? '').toLowerCase().includes(normalized)
          );
        }}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {canManage && (
        <ContainerTypeFormModal
          isOpen={modalState.open}
          mode={modalState.mode}
          initialValues={
            modalState.type
              ? {
                  code: modalState.type.code,
                  size: modalState.type.size,
                  description: modalState.type.description ?? undefined,
                }
              : undefined
          }
          onSubmit={handleSave}
          onClose={() => setModalState({ open: false, mode: 'create', type: null })}
          isSubmitting={typeCrud.isCreating || typeCrud.isUpdating}
        />
      )}
    </div>
  );
};

export default ContainerTypesPage;
