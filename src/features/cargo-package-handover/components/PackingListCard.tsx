import React from 'react';
import { ChevronRight, Package as PackageIcon, ShieldCheck, Ship, ArrowRight, Container as ContainerIcon, FileText } from 'lucide-react';
import type { PackingListListItem } from '@/features/packing-list/types';

interface PackingListCardProps {
  packingList: PackingListListItem;
  isSelected: boolean;
  onSelect: () => void;
  handedOverCount?: number;
  totalTarget?: number | string | null;
  isComplete?: boolean;
  shipper?: string | null;
  consignee?: string | null;
  bookingOrderCode?: string | null;
  children?: React.ReactNode;
}

export const PackingListCard: React.FC<PackingListCardProps> = ({
  packingList,
  isSelected,
  onSelect,
  handedOverCount,
  totalTarget,
  shipper,
  consignee,
  bookingOrderCode,
  children,
}) => {
  const { hblData } = packingList;
  const shipperName = shipper ?? hblData?.shipper;
  const consigneeName = consignee ?? hblData?.consignee;

  return (
    <>
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={isSelected}
        className={`w-full text-left transition-all duration-200 rounded-lg p-4 border border-l-4 ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 border-l-blue-500 shadow-sm'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 border-l-transparent hover:border-l-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {packingList.packingListNumber ?? packingList.id}
                </span>
              </div>
              {typeof handedOverCount === 'number' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isSelected
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                  {handedOverCount}/{totalTarget ?? '-'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Ship className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{hblData?.forwarderName ?? 'Forwarder'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">
                Order: <span className="text-gray-700 dark:text-gray-300">{bookingOrderCode ?? '—'}</span>
              </span>
            </div>
          </div>
          {isSelected && <ChevronRight className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="line-clamp-2 font-medium break-words leading-tight" title={shipperName ?? undefined}>{shipperName ?? '—'}</span>
            <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2 font-medium break-words leading-tight" title={consigneeName ?? undefined}>{consigneeName ?? '—'}</span>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <ContainerIcon className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
              <span className="truncate">
                <span className="text-gray-900 dark:text-gray-200">Container: {hblData?.containerNumber ?? '—'}</span>
                {hblData?.containerType && <span className="text-gray-500 ml-1">({hblData.containerType})</span>}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5 min-w-0 col-span-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">Seal: <span className="text-gray-900 dark:text-gray-200">{hblData?.sealNumber ?? '—'}</span></span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <PackageIcon className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <span className="truncate">HBL: <span className="text-gray-900 dark:text-gray-200">{hblData?.hblCode ?? '—'}</span></span>
            </div>
          </div>
        </div>
      </button>

      {isSelected && children ? <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">{children}</div> : null}
    </>
  );
};

export default PackingListCard;
