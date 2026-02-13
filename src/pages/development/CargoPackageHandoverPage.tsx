import React from 'react';
import { PackageSearch, RefreshCw } from 'lucide-react';

import { CargoPackageHandover } from '@/shared/features/cargo-package-handover';

const CargoPackageHandoverPage: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-blue-600">
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            <p className="text-xs font-bold uppercase tracking-wider">Development Preview</p>
          </div>
          <div className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Cargo Package Handover
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Validate the shared cargo package handover component with hardcoded data before backend integration.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <RefreshCw className="h-4 w-4" />
          <span>Manual refresh replaces list from in-memory source.</span>
        </div>
      </div>

      <CargoPackageHandover />
    </div>
  );
};

export default CargoPackageHandoverPage;
