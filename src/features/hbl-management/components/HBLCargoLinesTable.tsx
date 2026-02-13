import React from 'react';
import {
  ChevronDown,
  ChevronsUpDown,
  Trash2,
  Plus,
  Package,
} from 'lucide-react';
import type { HblPackingListLineFormValues } from '../types';
import { HBLCargoLineInlineForm } from './HBLCargoLineInlineForm';

type TableLine = HblPackingListLineFormValues & {
  clientId: string;
  persistedId?: string;
  isDirty?: boolean;
};

interface HBLCargoLinesTableProps {
  lines: TableLine[];
  loading: boolean;
  isEditable: boolean;
  inlineEditable?: boolean;
  errorMessage?: string | null;
  onAdd: () => void;
  onDelete: (clientId: string) => void;
  onLineChange?: (
    clientId: string,
    field: keyof HblPackingListLineFormValues,
    value: HblPackingListLineFormValues[keyof HblPackingListLineFormValues],
  ) => void;
  expandedLineId: string | null;
  onExpandedChange: (id: string | null) => void;
  hasUnsavedChanges?: boolean;
}

export const HBLCargoLinesTable: React.FC<HBLCargoLinesTableProps> = ({
  lines,
  loading,
  isEditable,
  inlineEditable = true,
  errorMessage,
  onAdd,
  onDelete,
  onLineChange,
  expandedLineId,
  onExpandedChange,
  hasUnsavedChanges = false,
}) => {
  const desktopGridColumns =
    'lg:grid-cols-[auto,1.5fr,1fr,0.9fr,1fr,1fr,0.9fr,0.9fr,1.1fr,0.8fr,auto]';
  const canInlineEdit = inlineEditable && isEditable;
  const canExpandRows = true;
  const canAddLine = isEditable;

  const toggleLine = (clientId: string) => {
    if (!canExpandRows) {
      return;
    }
    onExpandedChange(expandedLineId === clientId ? null : clientId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  const hasContent = lines.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Cargo Line Items
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {lines.length} line{lines.length === 1 ? '' : 's'} defined
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              Unsaved changes
            </span>
          )}
          {canAddLine && (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Line
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!hasContent ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
          <Package className="mb-3 h-10 w-10 text-gray-400 dark:text-gray-600" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No line items added yet.
          </p>
          {isEditable && (
            <p className="text-xs text-gray-400">
              Click &quot;Add Line&quot; to start defining line items.
            </p>
          )}
        </div>
      ) : (
        <>
          <div
            className={`hidden rounded-t-lg border border-gray-200 bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-800/80 dark:text-gray-200 lg:grid ${desktopGridColumns} lg:items-center lg:gap-3`}
          >
            <div className="flex items-center gap-2">
              <ChevronsUpDown className="h-4 w-4 text-gray-400" />
              Line No
            </div>
            <div>Commodity Desc</div>
            <div className="text-right">Package Count</div>
            <div className="text-left">Package Type</div>
            <div className="text-right">Cargo Qty</div>
            <div>Cargo Unit</div>
            <div className="text-right">Weight (kg)</div>
            <div className="text-right">Volume (m³)</div>
            <div>Shipmarks</div>
            <div>IMDG</div>
            <div className="text-right whitespace-nowrap pr-2">Actions</div>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const commodity =
                line.commodityDescription && line.commodityDescription.trim().length > 0
                  ? line.commodityDescription
                  : 'Untitled line';
              const isExpanded = expandedLineId === line.clientId;
              const isReadOnlyLine = !canInlineEdit;

              return (
                <div
                  key={line.clientId}
                  className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div
                    className={`hidden items-center gap-2 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 lg:grid ${desktopGridColumns} ${canExpandRows ? 'cursor-pointer' : ''}`}
                    onClick={() => canExpandRows && toggleLine(line.clientId)}
                    role={canExpandRows ? 'button' : undefined}
                    tabIndex={canExpandRows ? 0 : undefined}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {canExpandRows && (
                        <ChevronDown
                          className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''
                            }`}
                        />
                      )}
                      <span># {index + 1}</span>
                    </div>
                    <div className="truncate">{commodity}</div>
                    <div className="text-right">{line.numberOfPackages ?? '—'}</div>
                    <div>{line.packageTypeCode ?? '—'}</div>
                    <div className="text-right">{line.quantity ?? '—'}</div>
                    <div>{line.unitOfMeasure ?? '—'}</div>
                    <div className="text-right">{line.grossWeightKg ?? '—'}</div>
                    <div className="text-right">{line.volumeM3 ?? '—'}</div>
                    <div className="truncate text-xs text-gray-600 dark:text-gray-300">
                      {line.shipmarks ?? '—'}
                    </div>
                    <div>{line.imdg ?? '—'}</div>
                    <div className="flex items-center justify-end gap-2 justify-self-end whitespace-nowrap">
                      {isEditable && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(line.clientId);
                          }}
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40"
                          title="Delete line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 px-4 py-3 lg:hidden">
                    <div
                      className={`flex flex-1 items-center gap-3 text-left ${canExpandRows ? 'cursor-pointer' : ''}`}
                      onClick={() => canExpandRows && toggleLine(line.clientId)}
                      role={canExpandRows ? 'button' : undefined}
                      tabIndex={canExpandRows ? 0 : undefined}
                    >
                      {canExpandRows && (
                        <ChevronDown
                          className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''
                            }`}
                        />
                      )}
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                          # {index + 1}:{' '}
                          <span className="font-normal text-gray-700 dark:text-gray-200">
                            {commodity}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {line.quantity ?? '—'} × {line.unitOfMeasure ?? 'Unit'} •{' '}
                          {line.packageTypeCode ?? 'No code'}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Pkgs: {line.numberOfPackages ?? '—'} • Kg: {line.grossWeightKg ?? '—'} • M³:{' '}
                          {line.volumeM3 ?? '—'}
                        </div>
                      </div>
                    </div>
                    {isEditable && (
                      <div className="flex items-center gap-2 self-end">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(line.clientId);
                          }}
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40"
                          title="Delete line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-950/70">
                      <HBLCargoLineInlineForm
                        lineNumber={index + 1}
                        line={line}
                        readOnly={isReadOnlyLine}
                        onChange={
                          isReadOnlyLine || !onLineChange
                            ? undefined
                            : (field, value) => onLineChange(line.clientId, field, value)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default HBLCargoLinesTable;
