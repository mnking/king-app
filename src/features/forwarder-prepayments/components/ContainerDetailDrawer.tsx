import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Receipt, RefreshCw, Save, X } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import type { ContainerPayment } from '../types';
import { formatCurrency } from '../helpers/format';
import type { PaymentRecordForm } from '../schemas/payment-record-schema';
import { RecordPaymentModal } from './RecordPaymentModal';
import { PaymentBreakdownList } from './PaymentBreakdownList';
import type { BillingPaymentDetail } from '@/services/apiBillingPayments';

interface ContainerDetailDrawerProps {
  open: boolean;
  container: ContainerPayment | null;
  paymentDetail: BillingPaymentDetail | null;
  paymentLoading?: boolean;
  destuffingSaving?: boolean;
  onClose: () => void;
  onGetPaymentInformation: (containerId: string) => void;
  onRecordPayment: (containerId: string, values: PaymentRecordForm) => void;
  onUpdateAllowDestuffing: (containerId: string, allowDestuffing: boolean) => void;
}

const statusBadge = (status: ContainerPayment['paymentStatus']) => {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  return status === 'DONE'
    ? `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200`
    : `${base} bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200`;
};

const directionBadge = (direction: ContainerPayment['direction']) => {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  return direction === 'IMPORT'
    ? `${base} bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200`
    : `${base} bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200`;
};

const formatAmount = (value?: number | null) =>
  typeof value === 'number' ? formatCurrency(value) : '—';

export const ContainerDetailDrawer: React.FC<ContainerDetailDrawerProps> = ({
  open,
  container,
  paymentDetail,
  paymentLoading = false,
  destuffingSaving = false,
  onClose,
  onGetPaymentInformation,
  onRecordPayment,
  onUpdateAllowDestuffing,
}) => {
  const [activeTab, setActiveTab] = useState('payment');
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [allowDestuffing, setAllowDestuffing] = useState(false);

  const isCfsDone = container?.paymentStatus === 'DONE';
  const isBillingDone = paymentDetail?.status === 'DONE';
  const isPaymentDone = isCfsDone || isBillingDone;
  const hasRecordedPayment = (paymentDetail?.paymentRecords?.length ?? 0) > 0;
  const chargeItems = useMemo(() => paymentDetail?.prepayCharges ?? [], [paymentDetail]);
  const hasPrepayCharges = chargeItems.length > 0;
  const receivedAmount = useMemo(() => {
    if (!paymentDetail?.paymentRecords?.length) return null;
    return paymentDetail.paymentRecords.reduce(
      (sum, record) => sum + (record.actualAmount ?? 0),
      0,
    );
  }, [paymentDetail]);

  useEffect(() => {
    if (!open) {
      setActiveTab('payment');
      setRecordModalOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!container) return;
    setAllowDestuffing(Boolean(container.allowStuffingOrDestuffing));
  }, [container]);

  useEffect(() => {
    if (container?.direction !== 'IMPORT' && activeTab === 'destuffing') {
      setActiveTab('payment');
    }
  }, [container?.direction, activeTab]);

  const handleRecordPayment = (values: PaymentRecordForm) => {
    if (!container) return;
    onRecordPayment(container.id, values);
  };

  const handleGetPaymentInformation = () => {
    if (!container) return;
    onGetPaymentInformation(container.id);
  };

  const handleSaveDestuffing = () => {
    if (!container) return;
    onUpdateAllowDestuffing(container.id, allowDestuffing);
  };

  if (!open || !container) return null;

  const canProcessPayment = Boolean(paymentDetail) && !isPaymentDone;
  const canRecordPayment = canProcessPayment && !hasRecordedPayment;
  const canGetPaymentInformation = !paymentLoading && !hasPrepayCharges && !isPaymentDone;
  const isImportContainer = container.direction === 'IMPORT';
  const lockedDestuffing = Boolean(container.allowStuffingOrDestuffing);
  const hasDestuffingChanged =
    allowDestuffing !== Boolean(container.allowStuffingOrDestuffing);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full lg:w-1/2 max-w-full flex-col bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={directionBadge(container.direction)}>
                {container.direction}
              </span>
              <span className={statusBadge(container.paymentStatus)}>
                {container.paymentStatus === 'DONE' ? 'Done' : 'Pending'}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {container.containerNumber ?? 'N/A'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Forwarder code: {container.forwarderCode ?? 'N/A'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {container.direction === 'IMPORT' ? 'Booking number' : 'Export plan'}:{' '}
              {container.direction === 'IMPORT'
                ? container.orderReference?.bookingNumber ?? 'N/A'
                : container.orderReference?.exportPlanCode ?? 'N/A'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Prepaid amount
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {formatAmount(paymentDetail?.prepaidAmount)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total amount
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {formatAmount(paymentDetail?.totalAmount)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Received amount
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {typeof receivedAmount === 'number'
                  ? formatCurrency(receivedAmount)
                  : '—'}
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="underline" className="mb-2">
              <TabsTrigger value="payment" variant="underline">
                Payment detail
              </TabsTrigger>
              {isImportContainer ? (
                <TabsTrigger value="destuffing" variant="underline">
                  Destuffing confirmation
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="payment">
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Payment records
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Record each received payment.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGetPaymentInformation}
                    disabled={!canGetPaymentInformation}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Get payment information
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <PaymentBreakdownList
                    title="Prepay items"
                    items={chargeItems}
                    emptyText={
                      paymentLoading ? 'Loading charges...' : 'No prepay items yet.'
                    }
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <p>Received amount</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {typeof receivedAmount === 'number'
                        ? formatCurrency(receivedAmount)
                        : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRecordModalOpen(true)}
                      disabled={!canRecordPayment}
                      className="flex items-center gap-2"
                    >
                      <Receipt className="h-4 w-4" />
                      Record payment
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {isImportContainer ? (
              <TabsContent value="destuffing">
                <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <label
                    htmlFor="allow-destuffing"
                    className="flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    <input
                      id="allow-destuffing"
                      type="checkbox"
                      checked={allowDestuffing}
                      onChange={(event) => setAllowDestuffing(event.target.checked)}
                      disabled={lockedDestuffing || destuffingSaving}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    Allow destuffing
                  </label>
                  {lockedDestuffing ? (
                    <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-300">
                      <Lock className="h-3.5 w-3.5" />
                      Destuffing is already confirmed; toggle is locked.
                    </p>
                  ) : null}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleSaveDestuffing}
                      disabled={destuffingSaving || lockedDestuffing || !hasDestuffingChanged}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ) : null}
          </Tabs>
        </div>
      </div>

      <RecordPaymentModal
        open={recordModalOpen}
        container={container}
        defaultValues={{
          actualAmount: paymentDetail?.prepaidAmount ?? 0,
          receiptNumber: '',
          note: '',
        }}
        onClose={() => setRecordModalOpen(false)}
        onSave={handleRecordPayment}
      />
    </>
  );
};

export default ContainerDetailDrawer;
