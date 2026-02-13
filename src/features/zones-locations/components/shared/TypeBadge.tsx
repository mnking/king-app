import React from 'react';
import { Location } from '@/features/zones-locations/types';

type TypeValue = Location['zoneType'] | Location['type'] | undefined | null;

interface TypeBadgeProps {
  type: TypeValue;
  className?: string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({
  type,
  className = '',
}) => {
  const resolvedType = (type || 'CUSTOM') as Location['zoneType'];

  const getTypeStyles = (statusType: TypeValue) => {
    const baseClasses =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (statusType) {
      case 'RBS':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`;
      case 'CUSTOM':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  const getTypeLabel = (statusType: TypeValue) => {
    switch (statusType) {
      case 'RBS':
        return 'RBS';
      case 'CUSTOM':
        return 'Custom';
      default:
        return statusType ?? '';
    }
  };

  return (
    <span className={`${getTypeStyles(resolvedType)} ${className}`}>
      {getTypeLabel(resolvedType)}
    </span>
  );
};

export default TypeBadge;
