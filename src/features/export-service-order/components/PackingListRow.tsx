import React from 'react';
import { ChevronDown, ChevronRight, Trash2, Shuffle } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormInput } from '@/shared/components/forms';
import Button from '@/shared/components/ui/Button';
import type { ExportServiceOrderFormValues } from '../types';

interface PackingListRowProps {
  index: number;
  isReadOnly?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  onTransfer?: (index: number) => void;
}

const formatPlannedFlag = (planned?: boolean | null) => {
  if (planned === true) return 'Yes';
  if (planned === false) return 'No';
  return '-';
};

export const PackingListRow: React.FC<PackingListRowProps> = ({
  index,
  isReadOnly = false,
  isExpanded,
  onToggleExpand,
  onRemove,
  canRemove,
  onTransfer,
}) => {
  const { control, watch } = useFormContext<ExportServiceOrderFormValues>();

  const baseName = `packingLists.${index}` as const;
  const packingListNumber = watch(`${baseName}.packingListNumber`) || '';
  const workingStatus = watch(`${baseName}.workingStatus`) || '';
  const customsDeclarationNumber = watch(`${baseName}.customsDeclarationNumber`) || '';
  const planned = watch(`${baseName}.planned`);

  const handleRemove = () => {
    if (isReadOnly) return;
    onRemove(index);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className={`grid gap-3 px-4 py-3 items-center cursor-pointer transition-colors ${
          isExpanded ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'
        } lg:grid-cols-[auto_1.4fr_1fr_1fr_0.7fr_auto]`}
        onClick={onToggleExpand}
        data-packing-list-row
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {index + 1}
          </span>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Packing List</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {packingListNumber || 'Not set'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Working Status</div>
          <div className="text-sm text-gray-700 dark:text-gray-200">
            {workingStatus || '-'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Customs Decl.</div>
          <div className="text-sm text-gray-700 dark:text-gray-200">
            {customsDeclarationNumber || '-'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Planned</div>
          <div className="text-sm text-gray-700 dark:text-gray-200">
            {formatPlannedFlag(planned)}
          </div>
        </div>
        <div
          className="flex justify-end items-center gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          {onTransfer && !isReadOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onTransfer(index)}
              className="text-blue-600 hover:text-blue-700"
              title="Transfer packing list"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
          )}
          {canRemove && !isReadOnly && (
            <button
              type="button"
              onClick={handleRemove}
              className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              title="Remove packing list"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <FormInput<ExportServiceOrderFormValues>
                name={`${baseName}.customsDeclarationNumber`}
                control={control}
                label="Customs Declaration Number"
                disabled
              />
              <FormInput<ExportServiceOrderFormValues>
                name={`${baseName}.shipper`}
                control={control}
                label="Shipper"
                disabled
              />
              <FormInput<ExportServiceOrderFormValues>
                name={`${baseName}.consignee`}
                control={control}
                label="Consignee"
                disabled
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingListRow;
