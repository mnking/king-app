import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { QrCode, Ship, ShieldCheck, Package as PackageIcon, FileText } from 'lucide-react';
import type { CargoPackageRecord } from '../types';
import type { PackingListDetail } from '@/features/packing-list/types';

interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  packingListDetail: PackingListDetail | null | undefined;
  packageRecord: CargoPackageRecord | null;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ open, onClose, packingListDetail, packageRecord }) => {
  if (!open || !packageRecord || !packingListDetail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <QrCode className="h-4 w-4 text-blue-500" /> Print Preview
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="grid gap-2 text-sm text-gray-700 dark:text-gray-200">
          <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-100">
            <QrCode className="h-4 w-4" /> Code: {packageRecord.packageNo ?? '—'}
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
            <div className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-500" /> Packing List: {packingListDetail.packingListNumber ?? packingListDetail.id}</div>
            <div className="inline-flex items-center gap-2"><Ship className="h-4 w-4 text-emerald-500" /> Forwarder: {packingListDetail.hblData?.forwarderName ?? '—'}</div>
            <div className="inline-flex items-center gap-2"><PackageIcon className="h-4 w-4 text-blue-500" /> HBL: {packingListDetail.hblData?.hblCode ?? '—'}</div>
            <div className="inline-flex items-center gap-2"><PackageIcon className="h-4 w-4 text-cyan-500" /> Container: {packingListDetail.hblData?.containerNumber ?? '—'}</div>
            <div className="inline-flex items-center gap-2"><PackageIcon className="h-4 w-4 text-indigo-400" /> Type: {packingListDetail.hblData?.containerType ?? '—'}</div>
            <div className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Seal: {packingListDetail.hblData?.sealNumber ?? '—'}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
            <div>Line: {packageRecord.lineNo ?? '—'}</div>
            <div>Quantity: 1</div>
            <div className="col-span-2">Description: {packageRecord.cargoDescription ?? '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;
