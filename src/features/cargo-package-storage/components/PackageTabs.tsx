import React from 'react';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

interface PackageTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export const PackageTabs: React.FC<PackageTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const activeContent = tabs.find((t) => t.key === activeTab)?.content;

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.key
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.key
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0">
        {activeContent}
      </div>
    </div>
  );
};

export default PackageTabs;
