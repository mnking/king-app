import { AlertTriangle, CheckCircle2, FileDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { PackingListSelectionTable } from '../PackingListSelectionTable';
import { useCargoPackageLabelTab } from '../../hooks/useCargoPackageLabelTab';

export const CargoPackageLabelTab = () => {
  const {
    selectedPackingListId,
    handleSelectPackingList,
    packingList,
    totalCount,
    isLoading,
    isFetching,
    error,
    refetch,
    handleDownload,
    isDownloadDisabled,
    isDownloading,
    hasPackages,
  } = useCargoPackageLabelTab();

  return (
    <div className="space-y-4">
      <PackingListSelectionTable
        selectedId={selectedPackingListId}
        onSelect={handleSelectPackingList}
      />

      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileDown className="h-4 w-4" />
            Print Cargo Package Label
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={!selectedPackingListId || isFetching}
            >
              {isFetching ? <LoadingSpinner className="h-4 w-4" /> : 'Reload data'}
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isDownloadDisabled}
              loading={isDownloading}
            >
              Download PDF
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Select a packing list to load its cargo packages and download the label PDF.
        </p>

        <div className="space-y-1 text-sm">
          {!selectedPackingListId ? (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <p className="font-medium">Select a packing list to continue.</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Unable to load data</p>
                <p>{error.message || 'Failed to load packing list or cargo packages.'}</p>
              </div>
            </div>
          ) : isLoading || isFetching ? (
            <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-slate-700">
              <LoadingSpinner className="h-4 w-4" />
              Loading packing list data and cargo packages...
            </div>
          ) : !hasPackages ? (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">No cargo packages found</p>
                <p>This packing list does not have any cargo packages yet.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              Cargo packages ready. Click download to render the labels.
            </div>
          )}
        </div>

        {packingList && hasPackages ? (
          <div className="grid grid-cols-1 gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase text-slate-500">Packing List #</p>
              <p className="font-medium">{packingList.packingListNumber || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-slate-500">HBL</p>
              <p className="font-medium">{packingList.hblData?.hblCode || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-slate-500">Container</p>
              <p className="font-medium">{packingList.hblData?.containerNumber || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-slate-500">Forwarder</p>
              <p className="font-medium">{packingList.hblData?.forwarderName || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-slate-500">Container Type</p>
              <p className="font-medium">{packingList.hblData?.containerType || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-slate-500">Packages loaded</p>
              <p className="font-medium">{totalCount}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
