import React from 'react';
import EntityTable from '@/shared/components/EntityTable';
import { DynamicFilter } from '@/shared/components/DynamicFilter';
import HblPlLocationsTable from './HblPlLocationsTable';
import { usePackageFirstTable, type PackageFirstItem } from '../hooks/use-package-first-table';

interface HblPlFirstTableProps {
  canWrite?: boolean;
  onTotalCountChange?: (totalCount: number) => void;
}

export const HblPlFirstTable: React.FC<HblPlFirstTableProps> = ({
  canWrite = true,
  onTotalCountChange,
}) => {
  const {
    packageColumns,
    packageItems,
    isLoading,
    isFetching,
    error,
    resolvedTotalCount,
    pagination,
    setPagination,
    expandedRowId,
    handleToggleExpand,
    filterFields,
    filterValues,
    handleApplyFilter,
    handleClearFilter,
  } = usePackageFirstTable(canWrite, onTotalCountChange);

  return (
    <>
      <div className="h-full min-h-0 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 flex flex-col">
        <DynamicFilter
          fields={filterFields}
          onApplyFilter={handleApplyFilter}
          onClear={handleClearFilter}
          initialValues={filterValues}
          buttonLabel="Filters"
        />
        <EntityTable<PackageFirstItem>
          entities={packageItems}
          loading={isLoading}
          fetching={isFetching}
          error={error}
          entityName="packing list"
          entityNamePlural="packing lists"
          getId={(item) => item.id}
          columns={packageColumns}
          actions={[]}
          canCreate={false}
          canEdit={false}
          canDelete={false}
          canBulkEdit={false}
          enablePagination={true}
          initialPageSize={pagination.pageSize}
          pageSizeOptions={[50, 100, 200]}
          enableServerSidePagination={true}
          totalCount={resolvedTotalCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          className="flex-1 min-h-0"
          emptyStateMessage="No packing lists recorded."
          renderExpandedRow={(item) =>
            (
              <HblPlLocationsTable
                locations={item.locations}
              />
            )
          }
          expandedEntityId={expandedRowId}
          onEntityExpand={handleToggleExpand}
        />
      </div>
    </>
  );
};

export default HblPlFirstTable;
