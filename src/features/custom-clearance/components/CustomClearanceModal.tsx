import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useDocumentDownload } from '@/features/document-service';
import { DocumentUploader } from '@/features/document-service/components/DocumentUploader';
import type { Document } from '@/features/document-service/types';
import type { ClearanceRecord, ClearanceStatus, ModalMode } from '../types';
import {
  nextStatusOptions,
  statusDescriptions,
  statusLabels,
  statusToStepIndex,
} from '../constants';
import { StatusStepper } from '@/shared/components';

interface CustomClearanceModalProps {
  record: ClearanceRecord | null;
  mode: ModalMode;
  onClose: () => void;
  onSave: (updated: ClearanceRecord) => Promise<void> | void;
  isSaving?: boolean;
}

export const CustomClearanceModal: React.FC<CustomClearanceModalProps> = ({
  record,
  mode,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [status, setStatus] = useState<ClearanceStatus>('unregistered');
  const [attachedDoc, setAttachedDoc] = useState<ClearanceRecord['file']>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const documentDownload = useDocumentDownload();
  const isReadOnly = mode === 'view';
  const documentOwnerId = record?.id ?? undefined;
  const documentMetadata = useMemo(
    () => ({
      context: 'hbl',
      ...(record?.id && { hblId: record.id }),
    }),
    [record?.id],
  );

  useEffect(() => {
    if (!record) return;
    setStatus(record.status);
    setAttachedDoc(record.file);
    setActionMenuOpen(false);
  }, [record]);

  if (!record) return null;

  const currentIndex = statusToStepIndex[status] ?? 0;
  const finalLabel =
    status === 'rejected' ? statusLabels.rejected : status === 'approved' ? statusLabels.approved : 'Decision';
  const finalDescription =
    status === 'rejected' ? statusDescriptions.rejected : status === 'approved' ? statusDescriptions.approved : 'Awaiting decision';

  const steps = [
    { key: 'unregistered', label: statusLabels.unregistered, description: statusDescriptions.unregistered },
    { key: 'registered', label: statusLabels.registered, description: statusDescriptions.registered },
    { key: 'pending', label: statusLabels.pending, description: statusDescriptions.pending },
    { key: 'final', label: finalLabel, description: finalDescription },
  ];

  const handleSave = async () => {
    if (!record) return;
    await onSave({
      ...record,
      status,
      file: attachedDoc,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mode === 'edit' ? 'Edit clearance' : 'View clearance'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Displaying HBL details with document upload/download. Wire up real payloads later.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Direction
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white uppercase">
              {record.direction}
            </p>
          </div>
          <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              HBL Number
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {record.hblNumber}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Document
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Upload or download the clearance file for this HBL.
              </p>
            </div>
          </div>

          {attachedDoc ? (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {attachedDoc?.name}
              </div>
              {attachedDoc?.id ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    documentDownload.mutate({
                      documentId: attachedDoc.id,
                      fileName: attachedDoc.name ?? undefined,
                      openInNewTab: true,
                    })
                  }
                  disabled={documentDownload.isPending}
                >
                  Download
                </Button>
              ) : null}
              {!isReadOnly ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttachedDoc(null)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ) : (
            !isReadOnly && (
              <div className="mt-3">
                <DocumentUploader
                  ownerId={documentOwnerId}
                  description="HBL document attachment"
                  metadata={documentMetadata}
                  onSuccess={(document: Document) => {
                    setAttachedDoc(document);
                  }}
                />
              </div>
            )
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Clearance status
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Forward-only flow: Unregistered → Registered → Pending → Approved/Rejected.
              </p>
            </div>
          </div>

          <StatusStepper
            steps={steps}
            currentIndex={currentIndex}
            isRejected={status === 'rejected'}
            lineInsetPx={18}
          />

          {mode === 'edit' && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Next actions
              </span>
              {status === 'pending' ? (
                <div className="relative inline-flex">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-r-none"
                    onClick={() => {
                      setStatus('approved');
                      setActionMenuOpen(false);
                    }}
                  >
                    approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-l-none px-2"
                    onClick={() => setActionMenuOpen((prev) => !prev)}
                    aria-label="More status actions"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  {actionMenuOpen ? (
                    <div className="absolute right-0 top-10 z-20 w-32 rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800">
                      <button
                        type="button"
                        className="flex w-full items-center px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                        onClick={() => {
                          setStatus('approved');
                          setActionMenuOpen(false);
                        }}
                      >
                        approve
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                        onClick={() => {
                          setStatus('rejected');
                          setActionMenuOpen(false);
                        }}
                      >
                        reject
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                (nextStatusOptions[status] ?? []).map((next) => {
                  const verbs: Record<ClearanceStatus, string> = {
                    registered: 'register',
                    pending: 'pending',
                    approved: 'approve',
                    rejected: 'reject',
                    unregistered: 'unregistered',
                  };
                  const label = verbs[next];

                  return (
                    <Button key={next} type="button" size="sm" onClick={() => setStatus(next)}>
                      {label}
                    </Button>
                  );
                })
              )}
              {(nextStatusOptions[status] ?? []).length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Terminal status.</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
          {mode === 'edit' ? (
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              loading={isSaving}
              onClick={handleSave}
            >
              Save changes
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CustomClearanceModal;
