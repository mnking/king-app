import { X, Activity } from 'lucide-react';
import { CargoInspectionWorkflow } from '@/shared/features/cargo-inspection/components/CargoInspectionWorkflow';

export interface InspectionModalState {
  packingListId: string;
  packingListNo: string | null;
  sessionId?: string | null;
}

interface CargoInspectionModalProps {
  inspectionModal: InspectionModalState | null;
  onClose: () => void;
}

export const CargoInspectionModal = ({ inspectionModal, onClose }: CargoInspectionModalProps) => {
  if (!inspectionModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in">
      <div className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-950 dark:ring-white/10 animate-in zoom-in-95 duration-300">
        {/* Technical Corner Accents */}
        <div className="absolute left-0 top-0 h-2 w-2 border-l-2 border-t-2 border-indigo-500 opacity-50 dark:border-indigo-400" />
        <div className="absolute right-0 top-0 h-2 w-2 border-r-2 border-t-2 border-indigo-500 opacity-50 dark:border-indigo-400" />
        <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-indigo-500 opacity-50 dark:border-indigo-400" />
        <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-indigo-500 opacity-50 dark:border-indigo-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-8 py-5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                CARGO INSPECTION
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  SYSTEM STATUS:
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ACTIVE SESSION
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                PACKING LIST REF
              </span>
              <code className="text-sm font-mono font-medium text-slate-600 dark:text-slate-300">
                {inspectionModal.packingListNo ?? inspectionModal.packingListId}
              </code>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="relative max-h-[80vh] overflow-y-auto px-8 py-8">
          <CargoInspectionWorkflow
            packingListId={inspectionModal.packingListId}
            packingListNumber={inspectionModal.packingListNo ?? undefined}
            flowType="INBOUND"
            initialSession={
              inspectionModal.sessionId
                ? { id: inspectionModal.sessionId, flowType: 'INBOUND' }
                : undefined
            }
            initialSessionId={inspectionModal.sessionId ?? undefined}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};
