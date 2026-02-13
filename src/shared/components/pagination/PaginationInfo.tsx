import React from 'react';

export interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  currentPageSize: number;
  entityName: string;
  entityNamePlural: string;
  className?: string;
}

const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  pageSize,
  totalCount,
  currentPageSize,
  entityName,
  entityNamePlural,
  className = '',
}) => {
  const startIndex = currentPage * pageSize + 1;
  const endIndex = Math.min(startIndex + currentPageSize - 1, totalCount);

  if (totalCount === 0) {
    return (
      <div className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>
        No {entityNamePlural} found
      </div>
    );
  }

  if (totalCount === 1) {
    return (
      <div className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>
        Showing 1 {entityName}
      </div>
    );
  }

  return (
    <div className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>
      Showing{' '}
      <span className="font-medium text-gray-900 dark:text-white">
        {startIndex}
      </span>{' '}
      to{' '}
      <span className="font-medium text-gray-900 dark:text-white">
        {endIndex}
      </span>{' '}
      of{' '}
      <span className="font-medium text-gray-900 dark:text-white">
        {totalCount}
      </span>{' '}
      {entityNamePlural}
    </div>
  );
};

export default PaginationInfo;
