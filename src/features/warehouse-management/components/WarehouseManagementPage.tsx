import React from 'react';
import ZonesSidebar from './ZonesSidebar';
import LocationsPanel from './LocationsPanel';
import PackageFirstPanel from './PackageFirstPanel';
import { useWarehouseManagementPage } from '../hooks/use-warehouse-management-page';

const WarehouseManagementPage: React.FC = () => {
  const { viewMode, zonesSidebarProps, locationsPanelProps, packageFirstPanelProps } =
    useWarehouseManagementPage();

  return (
    <div className="h-full flex bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {viewMode === 'location' && (
        <ZonesSidebar {...zonesSidebarProps} />
      )}

      {viewMode === 'location' ? (
        <LocationsPanel {...locationsPanelProps} />
      ) : (
        <PackageFirstPanel {...packageFirstPanelProps} />
      )}
    </div>
  );
};

export default WarehouseManagementPage;
