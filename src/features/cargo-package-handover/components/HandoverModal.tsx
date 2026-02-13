import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Textarea } from '@/shared/components/ui/Textarea';
import type { CargoPackageRecord } from '../types';

interface HandoverModalProps {
  open: boolean;
  packageRecord: CargoPackageRecord | null;
  locations: string;
  note: string;
  metadata: string;
  onLocationsChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onMetadataChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export const HandoverModal: React.FC<HandoverModalProps> = ({
  open,
  packageRecord,
  locations,
  note,
  metadata,
  onLocationsChange,
  onNoteChange,
  onMetadataChange,
  onCancel,
  onSave,
  isSaving = false,
}) => {
  // Hardcoded flag to hide advanced fields
  const HIDE_ADVANCED_FIELDS = true;

  if (!open || !packageRecord) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Handover Package</div>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
          <div className="rounded-md bg-gray-50 p-3 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Package #{packageRecord.packageNo ?? packageRecord.id}
          </div>
          {!HIDE_ADVANCED_FIELDS && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Destination Locations (optional)</label>
              <Input
                placeholder="Location IDs (comma-separated)"
                value={locations}
                onChange={(e) => onLocationsChange(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Note (optional)</label>
            <Textarea
              placeholder="Add a note for this handover"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </div>
          {!HIDE_ADVANCED_FIELDS && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Metadata (optional, JSON)</label>
              <Textarea
                placeholder='e.g. {"gate":"south"}'
                value={metadata}
                onChange={(e) => onMetadataChange(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={isSaving} onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HandoverModal;
