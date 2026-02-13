import React, { useCallback, useEffect, useState } from 'react';
import { FilePenLine, X, FileText } from 'lucide-react';
import type {
  PackingListDetail,
  PackingListListItem,
  PackingListDocumentStatus,
} from '../types';
import {
  DOCUMENT_STATUS_OPTIONS,
  isDocumentStatusTransitionDisabled,
} from '../helpers/document-status.utils';
import { usePackingList, useUpdatePackingListDocumentStatus } from '../hooks';
import Button from '@/shared/components/ui/Button';

interface UpdateDocumentStatusModalProps {
  open: boolean;
  packingList: PackingListListItem | null;
  onClose: () => void;
}

export const UpdateDocumentStatusModal: React.FC<UpdateDocumentStatusModalProps> = ({
  open,
  packingList,
  onClose,
}) => {
  const packingListId = packingList?.id ?? '';

  const { data: packingListDetail } = usePackingList(packingListId, {
    enabled: open && Boolean(packingListId),
  });
  const updateDocumentStatus = useUpdatePackingListDocumentStatus();

  const [selectedStatus, setSelectedStatus] =
    useState<PackingListDocumentStatus>(
      DOCUMENT_STATUS_OPTIONS[0]?.value ?? 'CREATED',
    );

  const resolvedDocumentStatus: PackingListDocumentStatus | null =
    (packingListDetail?.documentStatus ??
      packingList?.documentStatus ??
      null) as PackingListDocumentStatus | null;

  const isOptionDisabled = useCallback(
    (optionValue: PackingListDocumentStatus) =>
      isDocumentStatusTransitionDisabled(resolvedDocumentStatus, optionValue),
    [resolvedDocumentStatus],
  );

  useEffect(() => {
    // Reset when switching packing list or when detail loads with a value
    setSelectedStatus(
      resolvedDocumentStatus ?? (DOCUMENT_STATUS_OPTIONS[0]?.value ?? 'CREATED'),
    );
  }, [packingListId, resolvedDocumentStatus]);

  if (!open || !packingList) return null;

  const resolvedPackingList: PackingListDetail | PackingListListItem =
    packingListDetail ?? packingList;

  const packingListLabel =
    resolvedPackingList.packingListNumber ?? resolvedPackingList.id;

  const documentCards = [
    {
      key: 'work',
      title: 'Work Cargo list',
      file:
        'workPackingListFile' in resolvedPackingList
          ? resolvedPackingList.workPackingListFile
          : null,
      url:
        'workPackingListFileUrl' in resolvedPackingList
          ? resolvedPackingList.workPackingListFileUrl
          : resolvedPackingList.workPackingListFile?.url ?? null,
    },
    {
      key: 'official',
      title: 'Official Cargo list',
      file:
        'officialPackingListFile' in resolvedPackingList
          ? resolvedPackingList.officialPackingListFile
          : null,
      url:
        'officialPackingListFileUrl' in resolvedPackingList
          ? resolvedPackingList.officialPackingListFileUrl
          : resolvedPackingList.officialPackingListFile?.url ?? null,
    },
  ];

  const handleSave = async () => {
    if (!packingListId || updateDocumentStatus.isPending) return;
    try {
      await updateDocumentStatus.mutateAsync({
        id: packingListId,
        payload: { documentStatus: selectedStatus },
      });
      onClose();
    } catch (error) {
      // Error handling covered in hook toast; keep here to avoid unhandled rejection
      console.error('Failed to update document status', error);
    }
  };

  const isSaving = updateDocumentStatus.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200">
              <FilePenLine className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900 dark:text-gray-50">
                Update Document Status
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Cargo list #{packingListLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close update document status modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
              <div className="font-semibold text-gray-900 dark:text-gray-50">
                Cargo list #
              </div>
              <div>{packingListLabel}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
              <div className="font-semibold text-gray-900 dark:text-gray-50">
                HBL
              </div>
              <div>{resolvedPackingList.hblData?.hblCode ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
              <div className="font-semibold text-gray-900 dark:text-gray-50">
                Container
              </div>
              <div>{resolvedPackingList.hblData?.containerNumber ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
              <div className="font-semibold text-gray-900 dark:text-gray-50">
                Consignee
              </div>
              <div>{resolvedPackingList.hblData?.consignee ?? '—'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              Documents
            </div>
            <div className="grid grid-cols-1 gap-3">
              {documentCards.map((doc) => (
                <div
                  key={doc.key}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {doc.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {doc.file?.name ?? 'No file uploaded'}
                      </div>
                    </div>
                  </div>
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">N/A</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="document-status"
              className="text-sm font-semibold text-gray-900 dark:text-gray-50"
            >
              Document status
            </label>
            <div className="relative">
              <select
                id="document-status"
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(event.target.value as PackingListDocumentStatus)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
              >
                {DOCUMENT_STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={isOptionDisabled(option.value)}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Current options: Created, Amended, Approved.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/40">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdateDocumentStatusModal;
