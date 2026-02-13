import React from 'react';
import { RefreshCw, Warehouse } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import type { Zone } from '@/features/zones-locations/types';
import ZoneCard from './ZoneCard';

interface ZonesSidebarProps {
  zones: Zone[];
  selectedZoneId: string | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  onSelect: (zoneId: string) => void;
  onRefresh: () => void;
}

export const ZonesSidebar: React.FC<ZonesSidebarProps> = ({
  zones,
  selectedZoneId,
  isLoading,
  isFetching,
  error,
  onSelect,
  onRefresh,
}) => (
  <div className="w-1/3 min-w-[320px] border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-gray-500" />
          Zones
        </h2>
        <Button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          loading={isFetching}
          variant="secondary"
          size="sm"
          className="gap-2"
          title="Refresh zones"
        >
          {!isFetching && <RefreshCw className="h-4 w-4" />}
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </div>

    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-gray-50 dark:bg-gray-900">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-100">
          Failed to load zones: {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <LoadingSpinner size="sm" /> Loading zones...
        </div>
      ) : null}

      {!isLoading && !error && zones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500 dark:text-gray-400">
          <Warehouse className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No zones found</p>
        </div>
      ) : null}

      {zones.map((zone) => (
        <ZoneCard
          key={zone.id}
          zone={zone}
          isSelected={zone.id === selectedZoneId}
          onSelect={onSelect}
        />
      ))}
    </div>
  </div>
);

export default ZonesSidebar;
