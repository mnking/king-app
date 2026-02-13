import React, { ReactNode } from 'react';
import { X, Loader2 } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  loading: boolean;
  children: ReactNode;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onDeselectAll,
  loading,
  children,
}) => {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onDeselectAll}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Bulk actions:
            </span>
            {children}
          </div>
        </div>

        {loading && (
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkActionsBar;
