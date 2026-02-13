import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ExecutionHeaderProps {
  planCode: string;
  isFetching: boolean;
  onRefresh: () => void | Promise<void>;
}

export const ExecutionHeader: React.FC<ExecutionHeaderProps> = ({
  planCode,
  isFetching,
  onRefresh,
}) => {
  return (
    <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Receive Containers — {planCode}
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 font-medium text-green-700 dark:bg-green-900/40 dark:text-green-200">
            Active execution
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </header>
  );
};
