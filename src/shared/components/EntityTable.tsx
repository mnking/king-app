import React, { useState, useEffect, ReactNode } from 'react';
import {
  MoreHorizontal,
  Loader2,
  CheckSquare,
  Square,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import BulkActionsBar from './BulkActionsBar';
import { PaginationControls, PaginationInfo } from './pagination';

// Generic types for the EntityTable
export interface EntityColumn<T> {
  key: string;
  label: ReactNode;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  sortingFn?: (
    rowA: { original: T },
    rowB: { original: T },
    columnId: string,
  ) => number;
}

export interface EntityAction<T> {
  key: string;
  label: ReactNode | ((item: T) => ReactNode);
  icon?: ReactNode;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
  disabled?: (item: T) => boolean;
  hidden?: (item: T) => boolean;
}

export interface BulkAction {
  key: string;
  label: string;
  onClick: (selectedIds: string[]) => Promise<void>;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

// Interface for dynamic bulk field operations (like comboboxes)
export interface BulkField<T> {
  key: keyof T;
  label: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  onUpdate: (selectedIds: string[], value: string) => Promise<void>;
}

export interface EntityTableProps<T> {
  // Data and loading states
  entities: T[];
  loading: boolean;
  fetching?: boolean; // Optional: show subtle indicator while fetching next page
  error: string | null;

  // Entity configuration
  entityName: string; // e.g., 'task', 'project'
  entityNamePlural: string; // e.g., 'tasks', 'projects'
  getId: (entity: T) => string;

  // Table configuration
  columns: EntityColumn<T>[];
  actions: EntityAction<T>[];
  bulkActions?: BulkAction[];
  bulkFields?: BulkField<T>[]; // New property for dynamic bulk fields

  // Search and filter
  searchPlaceholder?: string;
  searchFilter?: (entity: T, searchTerm: string) => boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  // Callbacks
  onCreateNew?: () => void;

  // Permissions
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canBulkEdit?: boolean;

  // Pagination configuration
  enablePagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  enableServerSidePagination?: boolean;
  totalCount?: number; // For server-side pagination
  pagination?: PaginationState; // External pagination state for server-side
  onPaginationChange?: (pagination: PaginationState) => void;

  // UI customization
  className?: string;
  emptyStateMessage?: string;
  emptyStateIcon?: ReactNode;

  // Row selection
  selectedEntityId?: string; // ID of the currently selected entity
  onEntitySelect?: (entity: T) => void; // Callback when a row is clicked

  /**
   * Optional render prop to display expanded content below a row.
   * When provided, clicking a row toggles its expansion.
   */
  renderExpandedRow?: (entity: T) => React.ReactNode;

  /**
   * Controlled expanded entity ID. When undefined, EntityTable manages expansion state internally.
   */
  expandedEntityId?: string | null;

  /**
   * Callback fired when row expansion is toggled (expand or collapse).
   */
  onEntityExpand?: (entity: T) => void;
}

export default function EntityTable<T>({
  entities,
  loading,
  fetching = false,
  error,
  entityName,
  entityNamePlural,
  getId,
  columns,
  actions,
  bulkActions = [],
  bulkFields = [],
  searchPlaceholder,
  searchFilter,
  searchValue,
  onSearchChange,
  onCreateNew,
  canCreate = true,
  canBulkEdit = true,
  enablePagination = true,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  enableServerSidePagination = false,
  totalCount,
  pagination: externalPagination,
  onPaginationChange,
  className = '',
  emptyStateMessage,
  emptyStateIcon,
  selectedEntityId,
  onEntitySelect,
  renderExpandedRow,
  expandedEntityId,
  onEntityExpand,
}: EntityTableProps<T>) {
  const [rowSelection, setRowSelection] = useState({});
  const [uncontrolledSearchTerm, setUncontrolledSearchTerm] = useState('');
  const isControlledSearch = searchValue !== undefined;
  const currentSearchTerm = isControlledSearch
    ? searchValue ?? ''
    : uncontrolledSearchTerm;

  useEffect(() => {
    if (isControlledSearch) {
      setUncontrolledSearchTerm(searchValue ?? '');
    }
  }, [isControlledSearch, searchValue]);

  const handleSearchChange = (value: string) => {
    if (!isControlledSearch) {
      setUncontrolledSearchTerm(value);
    }
    onSearchChange?.(value);
  };

  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(
    null,
  );
  const expandedId = expandedEntityId ?? internalExpandedId;

  // Sync internal pagination with external state for server-side pagination
  useEffect(() => {
    if (enableServerSidePagination && externalPagination) {
      setPagination(externalPagination);
    }
  }, [enableServerSidePagination, externalPagination]);

  // Convert EntityColumn to TanStack ColumnDef
  const tableColumns: ColumnDef<T>[] = React.useMemo(() => {
    const cols: ColumnDef<T>[] = [];

    // Add selection column if bulk actions or bulk fields are enabled
    if (canBulkEdit && (bulkActions.length > 0 || bulkFields.length > 0)) {
      cols.push({
        id: 'select',
        header: ({ table }) => {
          const currentPageRows = table.getRowModel().rows;
          const selectedRows = currentPageRows.filter((row) =>
            row.getIsSelected(),
          );
          const isAllSelected =
            currentPageRows.length > 0 &&
            selectedRows.length === currentPageRows.length;
          const isPartiallySelected =
            selectedRows.length > 0 &&
            selectedRows.length < currentPageRows.length;

          const handleSelectAllCurrentPage = () => {
            const currentPageRows = table.getRowModel().rows;
            const allSelected = currentPageRows.every((row) =>
              row.getIsSelected(),
            );

            currentPageRows.forEach((row) => {
              row.toggleSelected(!allSelected);
            });
          };

          return (
            <button
              onClick={handleSelectAllCurrentPage}
              className="w-5 h-5 flex items-center justify-center"
            >
              {isAllSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : isPartiallySelected ? (
                <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-white" />
                </div>
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          const isSelected = row.getIsSelected();
          return (
            <button
              onClick={row.getToggleSelectedHandler()}
              className="w-5 h-5 flex items-center justify-center"
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          );
        },
        size: 50,
      });
    }

    // Add entity columns
    columns.forEach((column) => {
      cols.push({
        id: column.key,
        accessorKey: column.key,
        header: ({ column: tableColumn }) => {
          if (!column.sortable) {
            return <span>{column.label}</span>;
          }

          const isSorted = tableColumn.getIsSorted();
          const canSort = tableColumn.getCanSort();

          return (
            <button
              className="flex items-center gap-2 text-left hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={tableColumn.getToggleSortingHandler()}
              disabled={!canSort}
            >
              <span>{column.label}</span>
              {isSorted === 'asc' && <ChevronUp className="h-4 w-4" />}
              {isSorted === 'desc' && <ChevronDown className="h-4 w-4" />}
              {!isSorted && canSort && (
                <div className="flex flex-col">
                  <ChevronUp className="h-3 w-3 opacity-30" />
                  <ChevronDown className="h-3 w-3 opacity-30 -mt-1" />
                </div>
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          const entity = row.original;
          return column.render
            ? column.render(entity)
            : String((entity as Record<string, unknown>)[column.key] ?? '');
        },
        enableGlobalFilter: column.searchable,
        enableSorting: column.sortable,
        ...(column.sortingFn ? { sortingFn: column.sortingFn } : {}),
      });
    });

    // Add actions column
    if (actions.length > 0) {
      cols.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const entity = row.original;
          const visibleActions = actions.filter(
            (action) => !action.hidden?.(entity),
          );
          return (
            <div className="relative group">
              <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none transition-all duration-150 hover:scale-105">
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
              <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                {visibleActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => action.onClick(entity)}
                    disabled={action.disabled?.(entity)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-md last:rounded-b-md ${action.variant === 'destructive'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                      } ${action.disabled?.(entity)
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                      }`}
                  >
                    {action.icon}
                    {typeof action.label === 'function'
                      ? action.label(entity)
                      : action.label}
                  </button>
                ))}
              </div>
            </div>
          );
        },
        size: 50,
      });
    }

    return cols;
  }, [columns, actions, canBulkEdit, bulkActions.length, bulkFields.length]);

  // Custom search filter function
  const globalFilterFn = React.useCallback(
    (row: { original: T }, _columnId: string, value: string) => {
      const entity = row.original;
      if (searchFilter) {
        return searchFilter(entity, value);
      }
      // Default search: check all searchable columns
      return columns
        .filter((col) => col.searchable)
        .some((col) => {
          const cellValue = col.render
            ? ''
            : (entity as Record<string, unknown>)[col.key];
          return String(cellValue).toLowerCase().includes(value.toLowerCase());
        });
    },
    [columns, searchFilter],
  );

  // Initialize TanStack Table
  const table = useReactTable({
    data: entities,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    ...(enablePagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: enableServerSidePagination,
    ...(enableServerSidePagination && totalCount !== undefined
      ? { rowCount: totalCount }
      : {}),
    state: {
      globalFilter: currentSearchTerm,
      rowSelection,
      sorting,
      ...(enablePagination ? { pagination } : {}),
    },
    onGlobalFilterChange: (updater) => {
      const nextValue =
        typeof updater === 'function'
          ? updater(currentSearchTerm)
          : updater;
      handleSearchChange(nextValue);
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    ...(enablePagination
      ? {
        onPaginationChange: (updater) => {
          setPagination((prev) => {
            const newPagination =
              typeof updater === 'function' ? updater(prev) : updater;

            if (
              expandedEntityId === undefined &&
              internalExpandedId !== null
            ) {
              setInternalExpandedId(null);
            }

            onPaginationChange?.(newPagination);
            return newPagination;
          });
        },
      }
      : {}),
    globalFilterFn,
    enableRowSelection:
      canBulkEdit && (bulkActions.length > 0 || bulkFields.length > 0),
    enableMultiRowSelection: true,
    getRowId: (row) => getId(row),
    initialState: {
      ...(enablePagination
        ? {
          pagination: {
            pageIndex: 0,
            pageSize: initialPageSize,
          },
        }
        : {}),
    },
  });

  const currentRows = enablePagination
    ? table.getRowModel().rows
    : table.getFilteredRowModel().rows;
  const totalDisplayCount = enableServerSidePagination
    ? totalCount || 0
    : table.getFilteredRowModel().rows.length;

  const handleExpansionToggle = (entity: T) => {
    const entityId = getId(entity);
    const isCurrentlyExpanded = expandedId === entityId;
    const nextExpandedId = isCurrentlyExpanded ? null : entityId;

    onEntityExpand?.(entity);

    if (expandedEntityId === undefined) {
      setInternalExpandedId(nextExpandedId);
    }
  };

  // Bulk action handler with updated selection logic
  const handleDeselectAll = () => {
    table.resetRowSelection();
    setRowSelection({});
  };

  // Bulk action handler
  const handleBulkAction = async (action: BulkAction) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    setBulkActionLoading(true);
    try {
      const selectedIds = selectedRows.map((row) => getId(row.original));
      await action.onClick(selectedIds);
      setRowSelection({});
      table.resetRowSelection();
    } catch (error) {
      console.error(`Error executing bulk action ${action.key}:`, error);
    } finally {
      setBulkActionLoading(false);
    }
  };
  // Bulk field handler
  const handleBulkFieldUpdate = async (field: BulkField<T>, value: string) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0 || !value) return;

    setBulkActionLoading(true);
    try {
      const selectedIds = selectedRows.map((row) => getId(row.original));
      await field.onUpdate(selectedIds, value);
      // Don't clear selection after field update, allow multiple field updates
    } catch (error) {
      console.error(
        `Error executing bulk field update ${String(field.key)}:`,
        error,
      );
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading {entityNamePlural}...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            Error loading {entityNamePlural}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {error instanceof Error ? error.message : error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {/* Header with search and create button */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-shrink-0">
        <div className="flex-1 max-w-md">
          {(searchPlaceholder || searchFilter) && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={
                  searchPlaceholder || `Search ${entityNamePlural}...`
                }
                value={currentSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-150"
              />
            </div>
          )}
        </div>

        {/* {canCreate && onCreateNew && (
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none transition-all duration-150 hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            Add {entityName}
          </button>
        )} */}
      </div>

      {/* Bulk actions bar */}
      {Object.keys(table.getState().rowSelection).length > 0 &&
        (bulkActions.length > 0 || bulkFields.length > 0) &&
        canBulkEdit && (
          <BulkActionsBar
            selectedCount={Object.keys(table.getState().rowSelection).length}
            onDeselectAll={handleDeselectAll}
            loading={bulkActionLoading}
          >
            {/* Bulk field comboboxes */}
            {bulkFields.map((field) => (
              <div
                key={String(field.key)}
                className="flex items-center space-x-2"
              >
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  {field.label}:
                </span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkFieldUpdate(field, e.target.value);
                      e.target.value = ''; // Reset select after update
                    }
                  }}
                  disabled={bulkActionLoading}
                  className="px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700"
                  defaultValue=""
                >
                  <option value="" disabled>
                    {field.placeholder || `Select ${field.label}`}
                  </option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Bulk action buttons */}
            {bulkActions.map((action) => (
              <button
                key={action.key}
                onClick={() => handleBulkAction(action)}
                disabled={action.disabled || bulkActionLoading}
                className={`px-3 py-1 text-sm rounded-md transition-all duration-150 hover:scale-105 focus:ring-2 focus:ring-offset-1 focus:outline-none ${action.variant === 'destructive'
                  ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg focus:ring-red-500 disabled:bg-red-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg focus:ring-blue-500 disabled:bg-blue-400'
                  }`}
              >
                {action.label}
              </button>
            ))}
          </BulkActionsBar>
        )}

      {/* Table */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-h-0 flex flex-col">
        {currentRows.length === 0 ? (
          // Empty state
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              {emptyStateIcon || (
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {emptyStateMessage || `No ${entityNamePlural} found`}
              </h3>
              {currentSearchTerm ? (
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search criteria
                </p>
              ) : canCreate && onCreateNew ? (
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    Get started by creating your first {entityName}
                  </p>
                  <button
                    onClick={onCreateNew}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none transition-all duration-150 hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    Add {entityName}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          // Table content
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentRows.map((row) => {
                  const entity = row.original;
                  const entityId = getId(entity);
                  const isSelected = selectedEntityId === entityId;
                  const isCheckboxSelected = row.getIsSelected();
                  const isExpanded = expandedId === entityId;
                  const expandedRowId = `expanded-${entityId}`;

                  const isInteractiveTarget = (target: HTMLElement) =>
                    Boolean(
                      target.closest('button') ||
                      target.closest('input[type="checkbox"]') ||
                      target.closest('a'),
                    );

                  const handleRowClick = (
                    event?: React.MouseEvent<HTMLTableRowElement> | React.KeyboardEvent<HTMLTableRowElement>,
                  ) => {
                    const target = event?.target as HTMLElement | undefined;
                    const isActionClick = target ? isInteractiveTarget(target) : false;

                    if (!isActionClick && onEntitySelect) {
                      onEntitySelect(entity);
                    }

                    if (!isActionClick && renderExpandedRow) {
                      handleExpansionToggle(entity);
                    }
                  };

                  const handleRowKeyDown = (
                    event: React.KeyboardEvent<HTMLTableRowElement>,
                  ) => {
                    if (!renderExpandedRow) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleRowClick(event);
                    }
                  };

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={handleRowClick}
                        onKeyDown={handleRowKeyDown}
                        tabIndex={renderExpandedRow ? 0 : undefined}
                        aria-expanded={renderExpandedRow ? String(isExpanded) : undefined}
                        aria-controls={isExpanded && renderExpandedRow ? expandedRowId : undefined}
                        className={`transition-all duration-150 ${onEntitySelect || renderExpandedRow ? 'cursor-pointer' : ''
                          } ${isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500 dark:border-l-blue-400'
                            : isCheckboxSelected
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          } ${isSelected || isCheckboxSelected ? '' : 'hover:shadow-sm'} ${isExpanded ? 'expanded' : ''}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={`px-3 py-2 text-sm text-gray-900 dark:text-white ${isSelected && cell.column.id !== 'select' && cell.column.id !== 'actions' ? 'pl-2' : ''
                              }`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>

                      {isExpanded && renderExpandedRow && (
                        <tr id={expandedRowId} className="expanded-content">
                          <td colSpan={tableColumns.length} className="px-3 py-2">
                            {renderExpandedRow(entity)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {enablePagination && totalDisplayCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <PaginationInfo
              currentPage={table.getState().pagination.pageIndex}
              pageSize={table.getState().pagination.pageSize}
              totalCount={totalDisplayCount}
              currentPageSize={currentRows.length}
              entityName={entityName}
              entityNamePlural={entityNamePlural}
            />
            {fetching && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>
          <PaginationControls
            currentPage={table.getState().pagination.pageIndex}
            totalPages={table.getPageCount()}
            pageSize={table.getState().pagination.pageSize}
            onPageChange={(page) => table.setPageIndex(page)}
            onPageSizeChange={(size) => table.setPageSize(size)}
            canPreviousPage={table.getCanPreviousPage()}
            canNextPage={table.getCanNextPage()}
            pageSizeOptions={pageSizeOptions}
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
}
