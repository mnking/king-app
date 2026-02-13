import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { toastAdapter } from '@/shared/services/toast';
import type { ContainerFormData } from '@/features/booking-orders/types';
import {
  CargoNature,
  isDangerousGoodsProperties,
  isOutOfGaugeProperties
} from '@/features/booking-orders/types';
import type { Forwarder } from '@/features/forwarder/types';

interface HBLTableProps {
  containerIndex: number;
  isReadOnly?: boolean;
  isImportFlow?: boolean;
  isLoadingHBLs?: boolean;
  containerNumber?: string;
  sealNumber?: string;
  onRefresh?: () => Promise<unknown> | void;
  isRefreshing?: boolean;
  forwarders?: Forwarder[];
  validationWarning?: string;
}

export const HBLTable: React.FC<HBLTableProps> = ({
  containerIndex,
  isReadOnly = false,
  isImportFlow = false,
  isLoadingHBLs = false,
  containerNumber = '',
  sealNumber = '',
  onRefresh,
  isRefreshing = false,
  forwarders,
  validationWarning,
}) => {
  const {
    watch,
    setValue,
  } = useFormContext<{ containers: ContainerFormData[] }>();

  const hbls = watch(`containers.${containerIndex}.hbls`) || [];

  // Lookup forwarder name by ID
  const getForwarderName = (issuerId?: string, fallbackName?: string) => {
    if (!issuerId) return fallbackName || '—';
    const forwarder = forwarders?.find(f => f.id === issuerId);
    return forwarder?.name || fallbackName || '—';
  };

  const removeHBL = async (hblIndex: number) => {
    if (isReadOnly || isImportFlow) return;

    const hblToRemove = hbls[hblIndex];
    const confirmMessage = hblToRemove?.hblNo
      ? `Remove HBL ${hblToRemove.hblNo}?`
      : `Remove HBL #${hblIndex + 1}?`;

    const confirmed = await toastAdapter.confirm(confirmMessage, {
      intent: 'danger',
    });

    if (confirmed) {
      const currentHbls = watch(`containers.${containerIndex}.hbls`) || [];
      setValue(
        `containers.${containerIndex}.hbls`,
        currentHbls.filter((_, i) => i !== hblIndex),
      );
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    await onRefresh();
    toastAdapter.success('HBL list refreshed');
  };

  // Format date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Get cargo nature badge color and label
  const getCargoNatureBadge = (nature?: CargoNature) => {
    if (!nature) return null;

    const badges = {
      [CargoNature.GC]: { label: 'GC', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', title: 'General Cargo' },
      [CargoNature.RC]: { label: 'RC', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', title: 'Reefer Cargo' },
      [CargoNature.HC]: { label: 'HC', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', title: 'Heavy Cargo' },
      [CargoNature.LC]: { label: 'LC', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300', title: 'Liquid Cargo' },
      [CargoNature.DG]: { label: 'DG', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', title: 'Dangerous Goods' },
      [CargoNature.OOG]: { label: 'OOG', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', title: 'Out of Gauge' },
    };

    return badges[nature] || null;
  };

  // Get cargo properties tooltip content
  const getCargoPropertiesTooltip = (hbl: ContainerFormData['hbls'][0]) => {
    if (!hbl.cargoProperties) return null;

    if (isDangerousGoodsProperties(hbl.cargoProperties)) {
      const { imoClass, unNumber, flashPoint } = hbl.cargoProperties;
      return (
        <div className="text-xs space-y-1">
          <div><strong>IMO Class:</strong> {imoClass}</div>
          <div><strong>UN Number:</strong> {unNumber}</div>
          {flashPoint && <div><strong>Flash Point:</strong> {flashPoint}</div>}
        </div>
      );
    }

    if (isOutOfGaugeProperties(hbl.cargoProperties)) {
      const { oogDescription } = hbl.cargoProperties;
      return (
        <div className="text-xs">
          <strong>Description:</strong> {oogDescription}
        </div>
      );
    }

    return null;
  };

  const formatCustomsStatus = (status?: string) => {
    if (!status) return '—';
    const normalized = status.trim();
    return normalized ? normalized.toUpperCase() : '—';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            House Bills of Lading (HBL)
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Auto-loaded based on container + seal combination
          </p>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoadingHBLs || !onRefresh || !containerNumber || !sealNumber}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh HBL list"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {validationWarning && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
            Cannot Save Booking Order
          </p>
          <p className="mt-1 text-sm leading-relaxed text-red-700 dark:text-red-200">
            {validationWarning}
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoadingHBLs && hbls.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Searching for HBLs with seal {sealNumber}...
          </p>
        </div>
      )}

      {/* Empty State - No Container/Seal */}
      {!isLoadingHBLs && hbls.length === 0 && (!containerNumber || !sealNumber) && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter container number and seal number to load associated HBLs
          </p>
        </div>
      )}

      {/* Empty State - No HBLs Found */}
      {!isLoadingHBLs && hbls.length === 0 && containerNumber && sealNumber && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            No HBLs found for container {containerNumber} with seal {sealNumber}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            HBLs must be created and approved in HBL Management before saving booking order
          </p>
        </div>
      )}

      {/* HBL Table */}
      {hbls.length > 0 && (
        <div className="overflow-x-auto">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md px-3 py-2 mb-3">
            <p className="text-xs text-green-700 dark:text-green-300">
              ✓ Found {hbls.length} HBL{hbls.length > 1 ? 's' : ''} for this container
            </p>
          </div>
          <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  HBL Code
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  Received Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  Issuer (Forwarder)
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  Shipper
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  Consignee
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  POL → POD
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  Vessel / Voyage
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  Customs Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  Cargo Nature
                </th>
                {!isReadOnly && (
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900">
              {hbls.map((hbl, hblIndex) => (
                <tr
                  key={hblIndex}
                  className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {/* # */}
                  <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100 align-top">
                    {hblIndex + 1}
                  </td>
                  {/* HBL Code */}
                  <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium align-top">
                    <div className="break-words">
                      {hbl.hblNo || '—'}
                    </div>
                  </td>
                  {/* Received Date */}
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                    <div className="break-words">
                      {formatDate(hbl.receivedAt)}
                    </div>
                  </td>
                  {/* Issuer (Forwarder) */}
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                    <div className="break-words">
                      {getForwarderName(hbl.issuerId, hbl.issuerName)}
                    </div>
                  </td>
                  {/* Shipper */}
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                    <div className="break-words">
                      {hbl.shipper || '—'}
                    </div>
                  </td>
                  {/* Consignee */}
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                    <div className="break-words">
                      {hbl.consignee || '—'}
                    </div>
                  </td>
                  {/* POL → POD */}
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                    <div className="break-words whitespace-nowrap">
                      {hbl.pol && hbl.pod ? `${hbl.pol} → ${hbl.pod}` : '—'}
                    </div>
                  </td>
                  {/* Vessel / Voyage */}
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                    <div className="break-words">
                      {hbl.vesselName && hbl.voyageNumber
                        ? `${hbl.vesselName} / ${hbl.voyageNumber}`
                        : hbl.vesselName || hbl.voyageNumber || '—'}
                    </div>
                  </td>
                  {/* Customs Status */}
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                    <div className="break-words whitespace-nowrap">
                      {formatCustomsStatus(hbl.customsStatus)}
                    </div>
                  </td>
                  {/* Cargo Classification */}
                  <td className="px-3 py-3 text-sm align-top">
                    {hbl.cargoNature ? (
                      <div className="relative group inline-block">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getCargoNatureBadge(hbl.cargoNature)?.color}`}
                          title={getCargoNatureBadge(hbl.cargoNature)?.title}
                        >
                          {getCargoNatureBadge(hbl.cargoNature)?.label}
                        </span>
                        {getCargoPropertiesTooltip(hbl) && (
                          <div className="absolute z-10 invisible group-hover:visible bg-gray-900 dark:bg-gray-700 text-white p-2 rounded-md shadow-lg min-w-[200px] left-0 top-full mt-1">
                            {getCargoPropertiesTooltip(hbl)}
                            <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  {/* Actions */}
                  {!isReadOnly && (
                    <td className="px-3 py-3 text-center align-top">
                      <button
                        type="button"
                        onClick={() => removeHBL(hblIndex)}
                        disabled={isImportFlow}
                        className="inline-flex items-center p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                        title="Remove HBL"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HBLTable;
