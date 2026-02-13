import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useCargoPackages, useUpdateCargoPackages } from '../hooks';
import type { ConditionStatus, RegulatoryStatus } from '../types';

interface OutboundPackageCheckingProps {
  packingListId: string;
  onBack: () => void;
}

const statusOptions: Array<{ value: ConditionStatus; label: string }> = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'PACKAGE_DAMAGED', label: 'Package Damaged' },
  { value: 'CARGO_DAMAGED', label: 'Cargo Damaged' },
];

const customsOptions: Array<{ value: RegulatoryStatus; label: string }> = [
  { value: 'UNINSPECTED', label: 'Uninspected' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

export const OutboundPackageChecking: React.FC<OutboundPackageCheckingProps> = ({
  packingListId,
  onBack,
}) => {
  const { data: packages, isLoading, isError, refetch } =
    useCargoPackages(packingListId);
  const updatePackages = useUpdateCargoPackages();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ConditionStatus>('NORMAL');
  const [bulkCustoms, setBulkCustoms] =
    useState<RegulatoryStatus>('UNINSPECTED');

  const allSelected = useMemo(() => {
    if (!packages || packages.length === 0) return false;
    return selectedIds.length === packages.length;
  }, [packages, selectedIds]);

  const toggleSelectAll = () => {
    if (!packages) return;
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(packages.map((item) => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one package to update');
      return;
    }
    updatePackages.mutate({
      packingListId,
      packageIds: selectedIds,
      updates: { conditionStatus: bulkStatus, regulatoryStatus: bulkCustoms },
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
            OUTBOUND
          </p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Package Checking
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Packing List: {packingListId}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Failed to load packages.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 text-sm font-medium text-blue-700 underline hover:text-blue-800 dark:text-blue-300"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : !packages || packages.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          No packages found
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold">Select all</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedIds.length} selected
            </span>
          </div>

          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {packages.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center justify-between gap-3 bg-white px-4 py-3 transition hover:bg-blue-50 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      Package #{item.id}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Position: {item.positionStatus ?? '—'} • Condition: {item.conditionStatus ?? '—'} • Regulatory: {item.regulatoryStatus ?? '—'}
                    </p>
                  </div>
                </div>
                <Shield className="h-4 w-4 text-blue-500" />
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Bulk Status Check
                </p>
                <div className="flex flex-wrap gap-3">
                  {statusOptions.map((option) => (
                    <label
                      key={option.value}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={bulkStatus === option.value}
                        onChange={() => setBulkStatus(option.value)}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Bulk Customs Check
                </p>
                <div className="flex flex-wrap gap-3">
                  {customsOptions.map((option) => (
                    <label
                      key={option.value}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={bulkCustoms === option.value}
                        onChange={() => setBulkCustoms(option.value)}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={onBack}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={updatePackages.isPending}
                disabled={selectedIds.length === 0}
              >
                Save
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Save action is stubbed until backend API is available.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
