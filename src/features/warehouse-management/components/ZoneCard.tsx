import React from 'react';
import { ChevronRight, Warehouse } from 'lucide-react';
import type { Zone } from '@/features/zones-locations/types';

interface ZoneCardProps {
  zone: Zone;
  isSelected: boolean;
  onSelect: (zoneId: string) => void;
}

export const ZoneCard: React.FC<ZoneCardProps> = ({
  zone,
  isSelected,
  onSelect,
}) => (
  <button
    type="button"
    onClick={() => onSelect(zone.id)}
    className={`w-full text-left transition-all duration-200 rounded-lg p-4 border border-l-4 ${
      isSelected
        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 border-l-blue-500 shadow-sm'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-l-transparent hover:border-l-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div
          className={`p-1.5 rounded-lg ${
            isSelected
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          <Warehouse className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {zone.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Code: {zone.code}
          </div>
        </div>
      </div>
      {isSelected && <ChevronRight className="h-5 w-5 text-blue-500 mt-1" />}
    </div>

    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
        {zone.type} Zone
      </span>
      <span
        className={`rounded-full px-2 py-1 ${
          zone.status === 'active'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-200'
        }`}
      >
        {zone.status.toUpperCase()}
      </span>
    </div>

    {zone.description ? (
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
        {zone.description}
      </p>
    ) : null}
  </button>
);

export default ZoneCard;
