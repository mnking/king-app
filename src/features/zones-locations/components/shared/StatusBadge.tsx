import React from 'react';
import { Zone, Location } from '@/features/zones-locations/types';

type Status = Zone['status'] | Location['status'];

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const getStatusStyles = (status: Status) => {
    const baseClasses =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      case 'inactive':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
      case 'locked':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  const getStatusLabel = (status: Status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'locked':
        return 'Locked';
      default:
        return status;
    }
  };

  return (
    <span className={`${getStatusStyles(status)} ${className}`}>
      {getStatusLabel(status)}
    </span>
  );
};

export default StatusBadge;
