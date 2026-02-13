import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  Zap,
  Ship,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Receipt,
  Anchor,
  CalendarClock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  UnplannedContainer,
  EnrichedUnplannedContainer,
  PlanContainerStatus,
} from '@/shared/features/plan/types';
import { calculateDaysUntil } from '../helpers';
import { getCargoBadgeClassName, getCargoBadgeConfig } from '@/shared/utils/cargo-badge';

import { PlanningContainerStatusBadge } from './PlanningContainerStatusBadge';

interface InProgressContainerCardProps {
  container: UnplannedContainer | EnrichedUnplannedContainer;
  processingStatus: PlanContainerStatus;
  className?: string;
  planContext?: { plannedStart: string };
}

/**
 * InProgressContainerCard - Collapsible container card for IN_PROGRESS plan modal
 *
 * Features:
 * - Collapsed by default (shows Row 1 only: container number, type, seal, badges, processing status)
 * - Click to expand (shows all details)
 * - Processing status badge (WAITING/RECEIVED/REJECTED/CANCELLED)
 */
export const InProgressContainerCard: React.FC<InProgressContainerCardProps> = ({
  container,
  processingStatus,
  className = '',
  planContext,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isEnriched = (
    c: UnplannedContainer | EnrichedUnplannedContainer,
  ): c is EnrichedUnplannedContainer => {
    return 'bookingOrder' in c || 'atYard' in c;
  };

  const enrichedContainer = isEnriched(container) ? container : null;

  const daysToExtraction = calculateDaysUntil(container.extractTo);
  const daysToFreeStorage = calculateDaysUntil(container.yardFreeTo);

  const isExtractionUrgent = daysToExtraction !== Infinity && daysToExtraction <= 2;
  const isFreeStorageUrgent = daysToFreeStorage !== Infinity && daysToFreeStorage <= 2;
  const isExtractionExpired = daysToExtraction !== Infinity && daysToExtraction < 0;
  const isFreeStorageExpired = daysToFreeStorage !== Infinity && daysToFreeStorage < 0;

  let isExtractionBeforePlanStart = false;
  let isFreeStorageBeforePlanStart = false;
  let isETAAfterPlanStart = false;

  if (planContext) {
    const planStart = new Date(planContext.plannedStart);

    if (container.extractTo) {
      isExtractionBeforePlanStart = new Date(container.extractTo) < planStart;
    }

    if (container.yardFreeTo) {
      isFreeStorageBeforePlanStart = new Date(container.yardFreeTo) < planStart;
    }

    if (enrichedContainer?.bookingOrder?.eta) {
      isETAAfterPlanStart = new Date(enrichedContainer.bookingOrder.eta) > planStart;
    }
  }

  const containerTypeCode =
    enrichedContainer?.enrichedHbls?.find((hbl) => hbl.containerTypeCode)?.containerTypeCode ||
    container.summary?.typeCode;

  const cargoNature = container.summary?.cargo_nature;
  const specialCargoBadge = getCargoBadgeConfig(cargoNature);
  const cargoBadgeClassName = getCargoBadgeClassName(cargoNature);

  const processingBadge = (() => {
    const badges = {
      WAITING: {
        label: 'Waiting',
        color:
          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
      },
      RECEIVED: {
        label: 'Received',
        color:
          'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 border',
      },
      REJECTED: {
        label: 'Rejected',
        color:
          'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 border',
      },
    };

    return badges[processingStatus] || {
      label: processingStatus,
      color:
        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
    };
  })();

  const formatHBLNumbers = () => {
    if (!enrichedContainer?.enrichedHbls || enrichedContainer.enrichedHbls.length === 0) {
      return container.hbls && container.hbls.length > 0
        ? `(${container.hbls.length} Bills)`
        : '(0 Bills)';
    }

    const hblNumbers = enrichedContainer.enrichedHbls.map((hbl) => hbl.hblNo);
    if (hblNumbers.length === 1) return `(${hblNumbers[0]})`;
    if (hblNumbers.length === 2) return `(${hblNumbers[0]}, ${hblNumbers[1]})`;
    return `(${hblNumbers[0]}, ${hblNumbers[1]}...)`;
  };

  return (
    <div
      className={`relative border rounded-lg p-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer hover:border-blue-200 dark:hover:border-blue-500 hover:shadow-sm transition-all border-gray-200 dark:border-gray-700 ${className}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Package className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-1">{container.containerNo}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">{containerTypeCode ? containerTypeCode : 'Type: N/A'}</span>
            {container.sealNumber && (
              <>
                <span>•</span>
                <span>Seal: {container.sealNumber}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {container.isPriority && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 whitespace-nowrap transition-colors duration-150">
              <Zap className="h-3.5 w-3.5" />
              High Priority
            </span>
          )}
          {specialCargoBadge && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${cargoBadgeClassName}`}
            >
              {specialCargoBadge.icon && <specialCargoBadge.icon className="h-3.5 w-3.5" />}
              {specialCargoBadge.label}
            </span>
          )}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${processingBadge.color}`}
          >
            {processingBadge.label}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Customs Status</p>
              <PlanningContainerStatusBadge status={container.customsStatus} type="customs" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Cargo Release Status</p>
              <PlanningContainerStatusBadge status={container.cargoReleaseStatus} type="cargo" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Yard Status</p>
              {enrichedContainer?.atYard !== undefined ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150 ${
                    enrichedContainer.atYard
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {enrichedContainer.atYard ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {enrichedContainer.atYard ? 'At Yard' : 'En Route'}
                </span>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
              )}
            </div>
          </div>

          {(isExtractionUrgent ||
            isFreeStorageUrgent ||
            isExtractionExpired ||
            isFreeStorageExpired ||
            isExtractionBeforePlanStart ||
            isFreeStorageBeforePlanStart ||
            isETAAfterPlanStart) && (
            <div className="flex flex-wrap items-center gap-2">
              {(isFreeStorageExpired || isFreeStorageUrgent) && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors duration-150 ${
                    isFreeStorageExpired
                      ? 'bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700'
                      : 'bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700'
                  }`}
                >
                  <AlertTriangle
                    className={`h-4 w-4 ${isFreeStorageExpired ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'}`}
                  />
                  {isFreeStorageExpired
                    ? 'Free Storage Expired'
                    : daysToFreeStorage === 0
                      ? 'Free Storage ends today'
                      : `Free Storage ends in ${daysToFreeStorage} day${daysToFreeStorage !== 1 ? 's' : ''}`}
                </span>
              )}
              {(isExtractionExpired || isExtractionUrgent) && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors duration-150 ${
                    isExtractionExpired
                      ? 'bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700'
                      : 'bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700'
                  }`}
                >
                  <AlertTriangle
                    className={`h-4 w-4 ${isExtractionExpired ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'}`}
                  />
                  {isExtractionExpired
                    ? 'Extraction Deadline Passed'
                    : daysToExtraction === 0
                      ? 'Extraction deadline today'
                      : `Extraction deadline in ${daysToExtraction} day${daysToExtraction !== 1 ? 's' : ''}`}
                </span>
              )}
              {isExtractionBeforePlanStart && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-300" />
                  Extraction deadline before plan start
                </span>
              )}
              {isFreeStorageBeforePlanStart && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-300" />
                  Free Storage deadline before plan start
                </span>
              )}
              {isETAAfterPlanStart && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-300" />
                  Container arrival time conflicts with plan start time
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order Code</p>
              <div className="flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <p className="font-semibold text-gray-900 dark:text-gray-100">{enrichedContainer?.bookingOrder?.code || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Agent</p>
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <p className="font-semibold text-gray-900 dark:text-gray-100">{enrichedContainer?.bookingOrder?.agentCode || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vessel / Voyage</p>
              <div className="flex items-center gap-1.5">
                <Ship className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {enrichedContainer?.bookingOrder?.vesselCode || 'N/A'} / {enrichedContainer?.bookingOrder?.voyage || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Port Arrival (ETA)</p>
              <div className="flex items-center gap-1.5">
                <Anchor className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <p className={`font-semibold ${isETAAfterPlanStart ? 'text-red-600 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {enrichedContainer?.bookingOrder?.eta ? new Date(enrichedContainer.bookingOrder.eta).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Free Storage Deadline</p>
              <div className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <p className={`font-semibold ${isFreeStorageExpired || isFreeStorageUrgent ? 'text-red-600 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {container.yardFreeTo ? new Date(container.yardFreeTo).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Extraction Deadline</p>
              <div className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <p className={`font-semibold ${isExtractionExpired || isExtractionUrgent ? 'text-red-600 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {container.extractTo ? new Date(container.extractTo).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">MBL / HBLs</p>
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {container.mblNumber || 'N/A'} / {formatHBLNumbers()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
