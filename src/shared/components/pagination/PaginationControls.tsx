import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  canPreviousPage: boolean;
  canNextPage: boolean;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  canPreviousPage,
  canNextPage,
  pageSizeOptions = [10, 20, 50, 100],
  disabled = false,
  className = '',
}) => {
  const [goToPageInput, setGoToPageInput] = useState('');

  const handleFirstPage = () => {
    if (!disabled && canPreviousPage) {
      onPageChange(0);
    }
  };

  const handlePreviousPage = () => {
    if (!disabled && canPreviousPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (!disabled && canNextPage) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    if (!disabled && canNextPage) {
      onPageChange(totalPages - 1);
    }
  };

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(goToPageInput);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber - 1); // Convert to 0-based index
      setGoToPageInput('');
    }
  };

  const handlePageSizeSelect = (newPageSize: number) => {
    if (!disabled) {
      onPageSizeChange(newPageSize);
      // Smooth scroll to top of the page when page size changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleFirstPage}
          disabled={disabled || !canPreviousPage}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="First page"
          aria-label="Go to first page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        <button
          onClick={handlePreviousPage}
          disabled={disabled || !canPreviousPage}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page Info */}
        <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Page <strong>{currentPage + 1}</strong> of{' '}
          <strong>{totalPages || 1}</strong>
        </span>

        <button
          onClick={handleNextPage}
          disabled={disabled || !canNextPage}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next page"
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          onClick={handleLastPage}
          disabled={disabled || !canNextPage}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Last page"
          aria-label="Go to last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      {/* Go to Page and Page Size Controls */}
      <div className="flex items-center gap-4">
        {/* Go to Page */}
        {totalPages > 1 && (
          <form onSubmit={handleGoToPage} className="flex items-center gap-2">
            <label
              htmlFor="goto-page"
              className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap"
            >
              Go to:
            </label>
            <input
              id="goto-page"
              type="number"
              min="1"
              max={totalPages}
              value={goToPageInput}
              onChange={(e) => setGoToPageInput(e.target.value)}
              disabled={disabled}
              className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder={String(currentPage + 1)}
            />
            <button
              type="submit"
              disabled={
                disabled ||
                !goToPageInput ||
                parseInt(goToPageInput) < 1 ||
                parseInt(goToPageInput) > totalPages
              }
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Go
            </button>
          </form>
        )}

        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="page-size"
            className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap"
          >
            Show:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => handlePageSizeSelect(Number(e.target.value))}
            disabled={disabled}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            per page
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls;
