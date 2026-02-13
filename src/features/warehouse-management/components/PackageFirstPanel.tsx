import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import HblPlFirstTable from './HblPlFirstTable';
import { usePackageFirstPanel } from '../hooks/use-package-first-panel';

interface PackageFirstPanelProps {
  viewMode: 'location' | 'package';
  onViewModeChange: (mode: 'location' | 'package') => void;
  canWrite?: boolean;
}

type StatCardProps = {
  title: string;
  hint: string;
  icon: React.ElementType;
  value: React.ReactNode;
};

const StatCard: React.FC<StatCardProps> = ({ title, hint, icon: Icon, value }) => (
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

export const PackageFirstPanel: React.FC<PackageFirstPanelProps> = ({
  viewMode,
  onViewModeChange,
  canWrite = true,
}) => {
  const {
    showStatCards,
    toggleStats,
    stats,
    lockedLocations,
    occupiedLocations,
    totalCargoPackages,
    totalPackages,
    setTotalPackages,
  } = usePackageFirstPanel();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                HBL / PL Table
              </p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                HBL/PL-first view
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'location' ? 'primary' : 'outline'}
                onClick={() => onViewModeChange('location')}
              >
                Location first
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'package' ? 'primary' : 'outline'}
                onClick={() => onViewModeChange('package')}
              >
                HBL/PL first
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={toggleStats}
                aria-label="Toggle stats view"
                className="px-2"
              >
                {showStatCards ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {showStatCards ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                Locked Locations {lockedLocations}
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                Cargo packages {totalCargoPackages}
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
                Packing lists {totalPackages}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                Occupied Locations {occupiedLocations}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <HblPlFirstTable
          canWrite={canWrite}
          onTotalCountChange={setTotalPackages}
        />
      </div>
    </div>
  );
};

export default PackageFirstPanel;
