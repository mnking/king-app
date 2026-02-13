import React from 'react';
import { useDocumentDownload } from '@/features/document-service';
import { DocumentUploader } from '@/features/document-service/components/DocumentUploader';
import type { Document } from '@/features/document-service/types';
import Button from '@/shared/components/ui/Button';
import type { PackingListFormValues } from '../types';
import type { SelectedHblMeta } from '../helpers/packing-list-form-modal.utils';

const InfoItem: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div>
    <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </div>
    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
      {value ?? '—'}
    </div>
  </div>
);

export const PackingListHblDetailsCard: React.FC<{
  hblMeta: SelectedHblMeta | null;
}> = ({ hblMeta }) => (
  <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
      HBL Details
    </h3>
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <InfoItem label="HBL Code" value={hblMeta?.hblCode ?? '—'} />
      <InfoItem
        label="Container Number"
        value={hblMeta?.containerNumber ?? '—'}
      />
      <InfoItem
        label="Container Type"
        value={hblMeta?.containerType ?? '—'}
      />
      <InfoItem label="Seal Number" value={hblMeta?.sealNumber ?? '—'} />
      <InfoItem label="Vessel" value={hblMeta?.vesselName ?? '—'} />
      <InfoItem label="Voyage" value={hblMeta?.voyageNumber ?? '—'} />
      <InfoItem label="Consignee" value={hblMeta?.consignee ?? '—'} />
      <InfoItem label="Forwarder (HBL)" value={hblMeta?.forwarderName || '—'} />
    </div>
  </div>
);

interface PackingListAttachmentsSectionProps {
  documentOwnerId: string | undefined;
  workDocumentMetadata: Record<string, string>;
  officialDocumentMetadata: Record<string, string>;
  workPackingListFile: PackingListFormValues['workPackingListFile'];
  officialPackingListFile: PackingListFormValues['officialPackingListFile'];
  isReadOnly: boolean;
  onWorkUploadSuccess: (document: Document) => void;
  onWorkRemove: () => void;
  onOfficialUploadSuccess: (document: Document) => void;
  onOfficialRemove: () => void;
}

export const PackingListAttachmentsSection: React.FC<
  PackingListAttachmentsSectionProps
> = ({
  documentOwnerId,
  workDocumentMetadata,
  officialDocumentMetadata,
  workPackingListFile,
  officialPackingListFile,
  isReadOnly,
  onWorkUploadSuccess,
  onWorkRemove,
  onOfficialUploadSuccess,
  onOfficialRemove,
}) => {
  const documentDownload = useDocumentDownload();

  return (
    <div className="md:col-span-4 grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
          Work Cargo list
        </label>
        {!workPackingListFile ? (
          !isReadOnly && (
            <DocumentUploader
              ownerId={documentOwnerId}
              description="Work packing list attachment" // TODO(i18n)
              metadata={workDocumentMetadata}
              onSuccess={onWorkUploadSuccess}
            />
          )
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {workPackingListFile?.name}
            </div>
            {workPackingListFile?.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  documentDownload.mutate({
                    documentId: workPackingListFile.id,
                    fileName: workPackingListFile.name ?? undefined,
                    openInNewTab: true,
                  })
                }
                disabled={documentDownload.isPending}
              >
                Download
              </Button>
            )}
            {!isReadOnly && (
              <Button type="button" variant="ghost" size="sm" onClick={onWorkRemove}>
                Remove
              </Button>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
          Official Cargo list
        </label>
        {!officialPackingListFile ? (
          !isReadOnly && (
            <DocumentUploader
              ownerId={documentOwnerId}
              description="Official packing list attachment" // TODO(i18n)
              metadata={officialDocumentMetadata}
              onSuccess={onOfficialUploadSuccess}
            />
          )
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {officialPackingListFile?.name}
            </div>
            {officialPackingListFile?.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  documentDownload.mutate({
                    documentId: officialPackingListFile.id,
                    fileName: officialPackingListFile.name ?? undefined,
                    openInNewTab: true,
                  })
                }
                disabled={documentDownload.isPending}
              >
                Download
              </Button>
            )}
            {!isReadOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onOfficialRemove}
              >
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const PackingListSummaryCards: React.FC<{
  lineTotals: { numberOfPackages: number; weight: number; volume: number };
}> = ({ lineTotals }) => (
  <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Total Packages
        </div>
        <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
          {lineTotals.numberOfPackages}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Auto-calculated from Cargo list Line Items
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Total Weight (KG)
        </div>
        <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
          {lineTotals.weight.toFixed(2)}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Sum of gross weights for all lines
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Total Volume (M³)
        </div>
        <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
          {lineTotals.volume.toFixed(3)}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Sum of volumes for all lines
        </div>
      </div>
    </div>
  </div>
);
