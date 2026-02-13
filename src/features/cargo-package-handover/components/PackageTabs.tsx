import React from 'react';
import { Package, Archive } from 'lucide-react';

type TabKey = 'toHandover' | 'handedOver';

interface PackageTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  toHandoverCount: number;
  handedOverCount: number;
  toHandoverContent: React.ReactNode;
  handedOverContent: React.ReactNode;
}

const tabClasses = (isActive: boolean) =>
  `flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'}`;

export const PackageTabs: React.FC<PackageTabsProps> = ({
  activeTab,
  onTabChange,
  toHandoverCount,
  handedOverCount,
  toHandoverContent,
  handedOverContent,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          className={tabClasses(activeTab === 'toHandover')}
          onClick={() => onTabChange('toHandover')}
        >
          <Package className="h-4 w-4" /> To Handover ({toHandoverCount})
        </button>
        <button
          type="button"
          className={tabClasses(activeTab === 'handedOver')}
          onClick={() => onTabChange('handedOver')}
        >
          <Archive className="h-4 w-4" /> Handed Over ({handedOverCount})
        </button>
      </div>

      <div className="space-y-3">
        {activeTab === 'toHandover' ? toHandoverContent : handedOverContent}
      </div>
    </div>
  );
};

export default PackageTabs;
