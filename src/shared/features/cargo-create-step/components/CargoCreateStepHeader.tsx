import React from 'react';
import { ClipboardList, FileText, Package, Ship, Truck } from 'lucide-react';

interface CargoCreateStepHeaderProps {
  packingListNumber?: string | null;
  hblNumber?: string | null;
  containerNumber?: string | null;
  directionFlow?: string | null;
  orderNumber?: string | null;
  forwarderName?: string | null;
  forwarderCode?: string | null;
  totalPackages: number;
  totalReceived: number;
}

const StatCompact: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex w-full min-w-0 items-center gap-2 border-b border-slate-200 pb-3 last:border-0 sm:w-auto sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4 dark:border-slate-800">
    <div className="text-slate-400 dark:text-slate-500">{icon}</div>
    <div className="flex flex-col leading-none">
      <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className="break-words font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  </div>
);

export const CargoCreateStepHeader: React.FC<CargoCreateStepHeaderProps> = ({
  packingListNumber,
  hblNumber,
  containerNumber,
  directionFlow,
  orderNumber,
  forwarderName,
  forwarderCode,
  totalPackages,
  totalReceived,
}) => {
  const forwarderLabel = forwarderName
    ? `${forwarderName}${forwarderCode ? ` (${forwarderCode})` : ''}`
    : '—';

  return (
    <header className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Cargo Package Receiving
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record received cargo packages for the current transaction.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
        <StatCompact icon={<FileText className="h-3.5 w-3.5" />} label="PL" value={packingListNumber || '—'} />
        <StatCompact icon={<Package className="h-3.5 w-3.5" />} label="HBL" value={hblNumber ?? '—'} />
        <StatCompact icon={<Ship className="h-3.5 w-3.5" />} label="Container" value={containerNumber ?? '—'} />
        <StatCompact icon={<Ship className="h-3.5 w-3.5" />} label="Direction" value={directionFlow ?? '—'} />
        <StatCompact icon={<Truck className="h-3.5 w-3.5" />} label="Order" value={orderNumber ?? '—'} />
        <StatCompact icon={<Package className="h-3.5 w-3.5" />} label="Forwarder" value={forwarderLabel} />
        <StatCompact icon={<Package className="h-3.5 w-3.5" />} label="Total" value={totalPackages} />
        <StatCompact icon={<Package className="h-3.5 w-3.5" />} label="Received" value={totalReceived} />
      </div>
    </header>
  );
};

export default CargoCreateStepHeader;
