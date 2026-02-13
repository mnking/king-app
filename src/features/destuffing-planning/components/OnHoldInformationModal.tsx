import React, { useEffect, useMemo } from 'react';
import { X, AlertCircle, Package, Warehouse } from 'lucide-react';
import type { DestuffingPlan } from '../types';
import { getTempOnHoldInfo, getTempCargoCustomsStatus, getTempOnHoldHBLDetails, logTempDataWarning } from '../utils/temp-onhold-data';

interface OnHoldInformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  container: DestuffingPlan['containers'][number] | null;
  onRemoveOnHold: () => void;
}

export const OnHoldInformationModal: React.FC<OnHoldInformationModalProps> = ({
  isOpen,
  onClose,
  container,
  onRemoveOnHold,
}) => {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Log temporary data warning (dev mode)
  useEffect(() => {
    if (isOpen && container) {
      logTempDataWarning(`On-Hold Information Modal: ${container.orderContainer.containerNo}`);
    }
  }, [isOpen, container]);

  // Filter HBLs that are on hold
  const onHoldHBLs = useMemo(() => {
    if (!container) return [];
    const hbls = container.hbls || [];
    return hbls.filter((hbl) => getTempCargoCustomsStatus(hbl.id) === 'on_hold');
  }, [container]);

  if (!isOpen || !container) {
    return null;
  }

  // Get temporary on-hold information
  const onHoldInfo = getTempOnHoldInfo(
    container.id,
    container.orderContainer.containerNo || 'Unknown',
    container.orderContainer.mblNumber,
    container.orderContainer.bookingOrder?.agentCode,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onhold-info-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-xl animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
          <h2 id="onhold-info-title" className="text-xl font-bold text-gray-900 dark:text-white">
            On-Hold Information
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Preview Mode Warning Banner */}
          <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                Preview Mode
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                This data is temporary for UI development and will be replaced with real API data.
              </p>
            </div>
          </div>

          {/* General Container Information */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              General Container Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Container Number */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Container Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {onHoldInfo.containerNumber}
                </p>
              </div>

              {/* Old Seal Number */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Old Seal Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {onHoldInfo.oldSealNumber || '—'}
                </p>
              </div>

              {/* New Seal Number */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">New Seal Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {onHoldInfo.newSealNumber || '—'}
                </p>
              </div>

              {/* MBL Number */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">MBL Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {onHoldInfo.mblNumber || '—'}
                </p>
              </div>

              {/* Forwarder */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Forwarder</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {onHoldInfo.forwarderName || '—'}
                </p>
              </div>

              {/* Checking Time */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Checking Time</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {onHoldInfo.checkingTime
                    ? new Date(onHoldInfo.checkingTime).toLocaleString()
                    : '—'}
                </p>
              </div>
            </div>

            {/* Notes */}
            {onHoldInfo.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {onHoldInfo.notes}
                </p>
              </div>
            )}
          </section>

          {/* HBLs Held by Customs */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              HBLs Held by Customs ({onHoldHBLs.length})
            </h3>
            {onHoldHBLs.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                No HBLs currently on hold
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {onHoldHBLs.map((hbl) => (
                  <span
                    key={hbl.id}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-red-100 text-red-700 border border-red-200"
                  >
                    {hbl.hblNo}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Detailed HBL Cargo On Hold Table */}
          {onHoldHBLs.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                On-Hold HBL Details
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        HBL Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Packing List
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Consignee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {onHoldHBLs.map((hbl) => {
                      const hblDetails = getTempOnHoldHBLDetails(hbl.id, hbl.hblNo);
                      const locationBadge = hblDetails.location === 'restuffed'
                        ? {
                            label: 'Restuffed',
                            color: 'bg-blue-100 text-blue-700 border-blue-200',
                            icon: Package,
                          }
                        : {
                            label: 'Stored',
                            color: 'bg-green-100 text-green-700 border-green-200',
                            icon: Warehouse,
                          };

                      return (
                        <tr key={hbl.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                            {hbl.hblNo}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {hblDetails.packingListNumber || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {hblDetails.consignee || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${locationBadge.color}`}>
                              <locationBadge.icon className="h-3 w-3" />
                              {locationBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                            {hblDetails.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Close
          </button>
          {onHoldHBLs.length > 0 && (
            <button
              type="button"
              onClick={onRemoveOnHold}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              Remove On-Hold Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
