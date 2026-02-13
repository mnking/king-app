import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BookingOrderHBL } from '@/features/booking-orders/types';
import type { DestuffingSelectedHbl } from '../../types';

interface HblSelectorCheckboxListProps {
  hbls: BookingOrderHBL[];
  selectedHbls: DestuffingSelectedHbl[];
  onSelectionChange: (selected: DestuffingSelectedHbl[]) => void;
  disabled?: boolean;
  error?: string;
}

const mapHblToSelection = (hbl: BookingOrderHBL): DestuffingSelectedHbl => ({
  hblId: hbl.hblId,
  hblCode: hbl.hblNo ?? hbl.hblId,
  packingListNo: hbl.summary?.packingListNo ?? null,
});

export const HblSelectorCheckboxList: React.FC<HblSelectorCheckboxListProps> = ({
  hbls,
  selectedHbls,
  onSelectionChange,
  disabled = false,
  error,
}) => {
  const selectedIds = React.useMemo(
    () => new Set(selectedHbls.map((selection) => selection.hblId)),
    [selectedHbls],
  );

  const handleToggle = (hbl: BookingOrderHBL) => {
    if (disabled) return;
    const exists = selectedIds.has(hbl.hblId);
    if (exists) {
      onSelectionChange(
        selectedHbls.filter((selection) => selection.hblId !== hbl.hblId),
      );
      return;
    }

    onSelectionChange([...selectedHbls, mapHblToSelection(hbl)]);
  };

  if (!hbls.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">No HBL records found for this container.</p>
            <p>Please remove this container or update booking data before planning.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          HBLs ({selectedIds.size}/{hbls.length})
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {hbls.map((hbl) => (
          <label key={hbl.id} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:cursor-not-allowed"
              checked={selectedIds.has(hbl.hblId)}
              disabled={disabled}
              onChange={() => handleToggle(hbl)}
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {hbl.hblNo ?? 'Unnamed HBL'}{' '}
                {hbl.summary?.packingListNo ? (
                  <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    Packing #{hbl.summary.packingListNo}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ID: {hbl.hblId.slice(0, 8)}
              </p>
            </div>
          </label>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
};
