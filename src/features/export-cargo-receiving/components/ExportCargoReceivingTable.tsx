import React, { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import type { PaginationState } from '@tanstack/react-table';

import EntityTable, {
  type EntityColumn,
} from '@/shared/components/EntityTable';
import type {
  ExportCargoReceivingDirectionFlow,
  ExportCargoReceivingListItem,
} from '../types';
import ExportCargoReceivingDetailCard from './ExportCargoReceivingDetailCard';

interface ExportCargoReceivingTableProps {
  packingLists: ExportCargoReceivingListItem[];
  loading: boolean;
  fetching?: boolean;
  error?: string | null;
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  className?: string;
}

const formatValue = (value?: string | null) =>
  value && value.trim().length > 0 ? value : '—';


const directionFlowConfig: Record<
  ExportCargoReceivingDirectionFlow,
  { label: string; badgeClass: string }
> = {
  IMPORT: {
    label: 'Import',
    badgeClass:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  },
  EXPORT: {
    label: 'Export',
    badgeClass:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  },
};

export const ExportCargoReceivingTable: React.FC<ExportCargoReceivingTableProps> = ({
  packingLists,
  loading,
  fetching,
  error,
  totalCount,
  pagination,
  onPaginationChange,
  className,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const columns: EntityColumn<ExportCargoReceivingListItem>[] = [
    {
      key: 'packingListNumber',
      label: 'PL',
      render: (item) => formatValue(item.packingListNumber),
    },
    {
      key: 'forwarderName',
      label: 'Forwarder',
      render: (item) =>
        formatValue(item.forwarderName ?? item.hblData?.forwarderName),
    },
    {
      key: 'shipper',
      label: 'Shipper',
      render: (item) =>
        formatValue(item.shippingDetail?.shipper ?? item.hblData?.shipper),
    },
    {
      key: 'consignee',
      label: 'Consignee',
      render: (item) =>
        formatValue(item.shippingDetail?.consignee ?? item.hblData?.consignee),
    },
    {
      key: 'containerType',
      label: 'Container Type',
      render: (item) => formatValue(item.hblData?.containerType),
    },
    {
      key: 'directionFlow',
      label: 'Direction Flow',
      render: (item) => {
        if (!item.directionFlow) {
          return '—';
        }
        const config = directionFlowConfig[item.directionFlow];
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.badgeClass}`}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'serviceOrderNumber',
      label: 'CFS Service Order',
      render: (item) => formatValue(item.serviceOrderNumber),
    },
    {
      key: 'pol',
      label: 'PoL',
      render: (item) => formatValue(item.shippingDetail?.pol),
    },
    {
      key: 'pod',
      label: 'PoD',
      render: (item) => formatValue(item.shippingDetail?.pod),
    },
  ];

  const renderExpandedRow = (item: ExportCargoReceivingListItem) => (
    <ExportCargoReceivingDetailCard item={item} />
  );

  const handleExpand = (item: ExportCargoReceivingListItem) => {
    setExpandedId((prev) => (prev === item.id ? null : item.id));
  };

  return (
    <EntityTable<ExportCargoReceivingListItem>
      entities={packingLists}
      loading={loading}
      fetching={fetching}
      error={error ?? null}
      entityName="packing list"
      entityNamePlural="packing lists"
      getId={(item) => item.id}
      columns={columns}
      actions={[]}
      canCreate={false}
      enablePagination
      enableServerSidePagination
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      totalCount={totalCount}
      initialPageSize={100}
      pageSizeOptions={[10, 20, 50, 100]}
      renderExpandedRow={renderExpandedRow}
      expandedEntityId={expandedId}
      onEntityExpand={handleExpand}
      selectedEntityId={expandedId ?? undefined}
      emptyStateIcon={<PackageSearch className="h-10 w-10 text-gray-400" />}
      emptyStateMessage="No packing lists match your filters"
      className={className}
    />
  );
};

export default ExportCargoReceivingTable;
