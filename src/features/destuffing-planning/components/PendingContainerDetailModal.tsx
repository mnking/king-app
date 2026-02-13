import React, { useEffect, useState } from 'react';
import { X, ExternalLink, AlertCircle } from 'lucide-react';
import type { DestuffingPlan } from '../types';
import { getTempContainerCustomsStatus, getTempCargoCustomsStatus, logTempDataWarning } from '../utils/temp-onhold-data';
import { OnHoldInformationModal } from './OnHoldInformationModal';
import { RemoveOnHoldStatusModal } from './RemoveOnHoldStatusModal';

interface PendingContainerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  container: DestuffingPlan['containers'][number] | null;
  plan: DestuffingPlan | null;
}

export const PendingContainerDetailModal: React.FC<PendingContainerDetailModalProps> = ({
  isOpen,
  onClose,
  container,
  plan,
}) => {
  const [isOnHoldModalOpen, setIsOnHoldModalOpen] = useState(false);
  const [isRemoveOnHoldModalOpen, setIsRemoveOnHoldModalOpen] = useState(false);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isOnHoldModalOpen && !isRemoveOnHoldModalOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isOnHoldModalOpen, isRemoveOnHoldModalOpen, onClose]);

  // Log temporary data warning when modal opens (dev mode)
  useEffect(() => {
    if (isOpen && container) {
      logTempDataWarning(`Container Detail Modal: ${container.orderContainer.containerNo}`);
    }
  }, [isOpen, container]);

  // Close child modals when parent closes
  useEffect(() => {
    if (!isOpen) {
      setIsOnHoldModalOpen(false);
      setIsRemoveOnHoldModalOpen(false);
    }
  }, [isOpen]);

  if (!isOpen || !container || !plan) {
    return null;
  }

  // Get temporary data
  const customsStatus = getTempContainerCustomsStatus(container.id);
  const approvedDevices = plan.equipmentBooked ?? false;
  const approvedAppointment =
    plan.approvedAppointment ?? plan.appointmentConfirmed ?? false;

  // Get customs status badge color
  const getCustomsStatusBadge = () => {
    if (!customsStatus) {
      return { label: 'Pending Check', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
    if (customsStatus === 'passed') {
      return { label: 'Passed', color: 'bg-green-100 text-green-700 border-green-200' };
    }
    return { label: 'On Hold', color: 'bg-red-100 text-red-700 border-red-200' };
  };

  const customsBadge = getCustomsStatusBadge();
  const hbls = container.hbls || [];
  const receivePlanId = container.orderContainer.receivePlanId;
  const orderCode = container.orderContainer.bookingOrder?.code;
  const orderId = container.orderContainer.orderId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="container-detail-title"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-xl animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
          <h2 id="container-detail-title" className="text-xl font-bold text-gray-900 dark:text-white">
            Container Details: {container.orderContainer.containerNo || 'Unknown'}
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
          {/* Development Mode Warning Banner */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Preview Mode
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Some data displayed is temporary for UI development and will be replaced with real API data.
                </p>
              </div>
            </div>
          )}

          {/* Container General Information */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              General Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Container Customs Status (Temporary) */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Container Customs Status
                </p>
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold border ${customsBadge.color}`}>
                  {customsBadge.label}
                </span>
              </div>

              {/* Approved Devices Booking */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Equipment Booking
                </p>
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold border ${
                  approvedDevices
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {approvedDevices ? 'Approved' : 'Pending'}
                </span>
              </div>

              {/* Approved Appointment */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Appointment Status
                </p>
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold border ${
                  approvedAppointment
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {approvedAppointment ? 'Confirmed' : 'Pending'}
                </span>
              </div>

              {/* Order Code */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Booking Order
                </p>
                {orderCode && orderId ? (
                  <a
                    href={`/booking-orders?id=${orderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    {orderCode}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                )}
              </div>

              {/* Receive Plan */}
              {receivePlanId && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Receive Plan
                  </p>
                  <a
                    href={`/receive-plan-workspace?planId=${receivePlanId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    View Receive Plan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Seal Number */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Seal Number
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {container.orderContainer.sealNumber || '—'}
                </p>
              </div>

              {/* MBL Number */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  MBL Number
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {container.orderContainer.mblNumber || '—'}
                </p>
              </div>

              {/* Container Status */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Container Status
                </p>
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold border ${
                  container.status === 'RECEIVED' ? 'bg-green-100 text-green-700 border-green-200' :
                  container.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                  container.status === 'DEFERRED' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {container.status}
                </span>
              </div>
            </div>
          </section>

          {/* HBL List Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              House Bills of Lading ({hbls.length})
            </h3>
            {hbls.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                No HBLs found for this container
              </div>
            ) : (
              <div className="space-y-3">
                {hbls.map((hbl) => {
                  // Get temporary cargo customs status
                  const cargoStatus = getTempCargoCustomsStatus(hbl.id);
                  const cargoStatusBadge = cargoStatus === 'passed'
                    ? { label: 'Cleared', color: 'bg-green-100 text-green-700 border-green-200' }
                    : { label: 'On Hold', color: 'bg-red-100 text-red-700 border-red-200' };

                  // Generate temporary packing list number
                  const tempPackingListNo = `PL${hbl.id.slice(-6)}`;

                  return (
                    <div
                      key={hbl.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Cargo Customs Status */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Cargo Customs Status
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${cargoStatusBadge.color}`}>
                            {cargoStatusBadge.label}
                          </span>
                        </div>

                        {/* HBL Number */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            HBL Number
                          </p>
                          <a
                            href={`/hbls?id=${hbl.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            {hbl.hblNo}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        {/* Packing List Number (Temporary) */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Packing List
                          </p>
                          <a
                            href={`/packing-lists?no=${tempPackingListNo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            {tempPackingListNo}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
          <div>
            {customsStatus === 'on_hold' && (
              <button
                type="button"
                onClick={() => setIsOnHoldModalOpen(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
              >
                View On-Hold Information
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* On-Hold Information Modal (Stacked) */}
      <OnHoldInformationModal
        isOpen={isOnHoldModalOpen}
        onClose={() => setIsOnHoldModalOpen(false)}
        container={container}
        onRemoveOnHold={() => {
          setIsOnHoldModalOpen(false);
          setIsRemoveOnHoldModalOpen(true);
        }}
      />

      {/* Remove On-Hold Status Modal (Stacked) */}
      <RemoveOnHoldStatusModal
        isOpen={isRemoveOnHoldModalOpen}
        onClose={() => setIsRemoveOnHoldModalOpen(false)}
        container={container}
      />
    </div>
  );
};
