
import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Container as ContainerIcon,
  FileText,
  Package,
  ShieldCheck,
  Ship,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import type { PackingListDetail, PackingListListItem } from '@/features/packing-list/types';

import type { CargoPackageRecord } from '../types';

import { PackageTabs } from './PackageTabs';

interface HandoverDetailsProps {
    selectedPackingListId: string | null;
    packingList?: PackingListListItem; // From the sidebar list (has reliable header data)
    packingListDetail?: PackingListDetail;
    bookingOrderCode?: string | null;
    isLoadingPackingListDetail: boolean;
    cargoPackages?: CargoPackageRecord[];
    isLoadingPackages: boolean;
    isPackageError: boolean;
    packageError: unknown;
    activeTab: 'toHandover' | 'handedOver';
    setActiveTab: (tab: 'toHandover' | 'handedOver') => void;
    toHandoverPackages: CargoPackageRecord[];
    handedOverPackages: CargoPackageRecord[];
    canCompleteHandover: boolean;
    renderPackageRow: (pkg: CargoPackageRecord, isHandedOver: boolean) => React.ReactNode;
}

export const HandoverDetails: React.FC<HandoverDetailsProps> = ({
    selectedPackingListId,
    packingList,
    packingListDetail,
    bookingOrderCode,
    isLoadingPackingListDetail,
    cargoPackages,
    isLoadingPackages,
    isPackageError,
    packageError,
    activeTab,
    setActiveTab,
    toHandoverPackages,
    handedOverPackages,
    canCompleteHandover,
    renderPackageRow,
}) => {
    const showCompleteAction = false;

    if (!selectedPackingListId) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Select a Packing List</p>
                    <p className="text-sm">Choose a packing list from the sidebar to view details</p>
                </div>
            </div>
        );
    }

    const hblData = packingList?.hblData ?? packingListDetail?.hblData;
    const packingListNumber =
        packingList?.packingListNumber ?? packingListDetail?.packingListNumber ?? 'Loading…';
    const forwarderName = hblData?.forwarderName ?? 'Forwarder';
    const orderCode = bookingOrderCode ?? '—';
    const shipper = hblData?.shipper ?? '—';
    const consignee = hblData?.consignee ?? '—';
    const containerNumber = hblData?.containerNumber ?? '—';
    const containerType = hblData?.containerType ?? null;
    const sealNumber = hblData?.sealNumber ?? '—';
    const hblCode = hblData?.hblCode ?? '—';

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
            {/* Header Info */}
            <div className="border-b border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                                    {packingListNumber}
                                </h2>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200">
                                Order {orderCode}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                <Ship className="h-3.5 w-3.5" />
                                {forwarderName}
                            </span>
                        </div>

                        <div className="flex flex-1">
                            <div className="flex flex-1 border-gray-200 p-3">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="line-clamp-2 font-medium">{shipper}</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="line-clamp-2 font-medium">{consignee}</span>
                                </div>
                            </div>
                            <div className="flex flex-1">
                                <div className="w-full rounded-lg border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
                                    <div className="grid gap-3 sm:grid-cols-3 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-start gap-2">
                                            <ContainerIcon className="h-4 w-4 text-indigo-500" />
                                            <span className="break-all font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                                {containerNumber}
                                            </span>
                                            {containerType && (
                                                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                                    ({containerType})
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                            <span className="break-all font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                                {sealNumber}
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Package className="h-4 w-4 text-blue-500" />
                                            <span className="break-all font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                                {hblCode}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {showCompleteAction ? (
                        <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {canCompleteHandover ? 'All packages handed over' : 'Disabled until completion'}
                            </div>
                            <Button variant="primary" size="sm" disabled={!canCompleteHandover}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Handover
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">

                {(isLoadingPackingListDetail || isLoadingPackages) && (
                    <div className="flex items-center justify-center py-10">
                        <LoadingSpinner size="lg" />
                        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading details…</span>
                    </div>
                )}

                {isPackageError && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
                        Failed to load cargo packages: {packageError instanceof Error ? packageError.message : 'Unknown error'}.
                    </div>
                )}

                {cargoPackages && cargoPackages.length === 0 && !isPackageError && !isLoadingPackages ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
                        No cargo packages found. Destuff/inspection may not be completed.
                    </div>
                ) : null}

                {/* Tabs */}
                {!isLoadingPackingListDetail && !isLoadingPackages && (
                    <PackageTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        toHandoverCount={toHandoverPackages.length}
                        handedOverCount={handedOverPackages.length}
                        toHandoverContent={
                          <div className="space-y-3">
                            {toHandoverPackages.length > 0 ? (
                              toHandoverPackages.map((pkg) => renderPackageRow(pkg, false))
                            ) : (
                              <div className="text-center py-10 text-gray-500">
                                No packages pending handover.
                              </div>
                            )}
                          </div>
                        }
                        handedOverContent={
                          <div className="space-y-3">
                            {handedOverPackages.length > 0 ? (
                              handedOverPackages.map((pkg) => renderPackageRow(pkg, true))
                            ) : (
                              <div className="text-center py-10 text-gray-500">
                                No handed over packages yet.
                              </div>
                            )}
                          </div>
                        }
                    />
                )}
            </div>
        </div>
    );
};
