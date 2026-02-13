import React, { useMemo } from 'react';
import EntityTable from '@/shared/components/EntityTable';
import { DynamicFilter } from '@/shared/components/DynamicFilter';
import { useMoveLoadedContainerTable } from '../hooks/use-move-loaded-container-table';
import {
  filterFields,
  getMoveLoadedContainerColumns,
  type MoveLoadedContainerRow,
} from './MoveLoadedContainerTableColumn';
import MoveLoadedContainerDetailsModal from './MoveLoadedContainerDetailsModal';

interface MoveLoadedContainerTableProps {
  canRead: boolean;
  canCheck: boolean;
  canWrite: boolean;
}

const MoveLoadedContainerTable: React.FC<MoveLoadedContainerTableProps> = ({
  canRead,
  canCheck,
  canWrite,
}) => {
  const {
    actions,
    rows,
    totalCount,
    tableError,
    isLoading,
    isFetching,
    pagination,
    setPagination,
    handleApplyFilter,
    handleClearFilter,
    containerOptions,
    containerOptionsLoading,
    containerSearchTerm,
    setContainerSearchTerm,
    planCodeOptions,
    planCodeOptionsLoading,
    planCodeSearchTerm,
    setPlanCodeSearchTerm,
    isModalOpen,
    modalMode,
    activeRecord,
    closeModal,
  } = useMoveLoadedContainerTable({
    canRead,
    canCheck,
    canWrite,
  });

  const columns = useMemo(() => getMoveLoadedContainerColumns(), []);
  const filterOptions = useMemo(
    () => [
      ...filterFields,
      {
        type: 'async-multiselect' as const,
        name: 'containerNumber',
        label: 'Container Number',
        placeholder: 'Select container numbers',
        options: containerOptions,
        keyField: 'value',
        valueField: 'label',
        searchValue: containerSearchTerm,
        searchPlaceholder: 'Search container numbers...',
        onSearchChange: setContainerSearchTerm,
        isLoading: containerOptionsLoading,
      },
      {
        type: 'async-multiselect' as const,
        name: 'planCode',
        label: 'Plan Code',
        placeholder: 'Select plan codes',
        options: planCodeOptions,
        keyField: 'value',
        valueField: 'label',
        searchValue: planCodeSearchTerm,
        searchPlaceholder: 'Search plan codes...',
        onSearchChange: setPlanCodeSearchTerm,
        isLoading: planCodeOptionsLoading,
      },
    ],
    [
      containerOptions,
      containerOptionsLoading,
      containerSearchTerm,
      planCodeOptions,
      planCodeOptionsLoading,
      planCodeSearchTerm,
      setContainerSearchTerm,
      setPlanCodeSearchTerm,
    ],
  );

  return (
    <section className="flex h-full flex-col shadow-sm">
      <DynamicFilter
        fields={filterOptions}
        onApplyFilter={handleApplyFilter}
        onClear={handleClearFilter}
        buttonLabel="Filters"
      />

      <div className="mt-4 flex-1 overflow-hidden rounded-xl bg-white dark:border-gray-700 dark:bg-gray-800">
        <EntityTable<MoveLoadedContainerRow>
          entities={rows}
          loading={isLoading}
          fetching={isFetching && !isLoading}
          error={tableError}
          entityName="loaded container"
          entityNamePlural="loaded containers"
          getId={(item) => item.id}
          columns={columns}
          actions={actions}
          enablePagination={true}
          enableServerSidePagination={true}
          totalCount={totalCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          initialPageSize={pagination.pageSize}
          className="h-full"
        />
      </div>

      <MoveLoadedContainerDetailsModal
        open={isModalOpen}
        mode={modalMode}
        record={activeRecord}
        onClose={closeModal}
        canCheck={canCheck}
        canWrite={canWrite}
      />
    </section>
  );
};

export default MoveLoadedContainerTable;
