import React, { useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import FormInput from '@/shared/components/forms/FormInput';
import FormDateInput from '@/shared/components/forms/FormDateInput';
import FormCheckbox from '@/shared/components/forms/FormCheckbox';
import FormSingleSelect from '@/shared/components/forms/FormSingleSelect';
import FormTextarea from '@/shared/components/forms/FormTextarea';
import { ContainerNumberPicker } from '@/features/containers/components/ContainerNumberPicker';
import type { ContainerNumberPickerHandle } from '@/features/containers/types/container-picker.types';
import { useContainer } from '@/features/containers/hooks/use-containers-query';
import { useContainerHBLs } from '@/features/booking-orders/hooks/use-approved-hbls';
import { toastAdapter } from '@/shared/services/toast';
import HBLTable from './HBLTable';
import { ContainerStatusBadge } from './containers/ContainerStatusBadge';
import {
  CARGO_RELEASE_STATUS_LABELS,
} from '@/shared/constants/container-status';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Zap,
  ClipboardList,
} from 'lucide-react';
import type { BookingOrderCreateForm, CargoNature } from '@/features/booking-orders/types';
import { isDangerousGoodsProperties, isOutOfGaugeProperties } from '@/features/booking-orders/types';
import { cargoNatureOptions, imoClassOptions } from '../schemas/cargo-property-schemas';
import type { Forwarder } from '@/features/forwarder/types';
import type { HouseBill } from '@/features/hbl-management/types';

interface ContainerRowProps {
  index: number;
  formMode?: 'create' | 'edit' | 'view';
  onRemove: (index: number) => void;
  canRemove: boolean;
  isReadOnly?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  shouldAutoFocus?: boolean;
  onLoadingStateChange?: (index: number, isLoading: boolean) => void;
  forwarders?: Forwarder[];
  onUpdatePlan?: (index: number) => void;
  isPlanUpdateDisabled?: boolean;
  isDuplicatePair?: boolean;
}

const NON_APPROVED_HBL_ERROR_PREFIX =
  'All HBLs for this container must be approved before saving booking order.';
const NO_HBL_FOUND_ERROR_PREFIX =
  'No HBL found for this container and seal. Please create and approve all HBLs in HBL Management before saving booking order.';

const formatHBLStatus = (status?: string) => {
  if (!status) return 'Unknown';
  const normalized = status.trim().toLowerCase();
  if (!normalized) return 'Unknown';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const isApprovedHBL = (hbl: HouseBill) =>
  String(hbl.status ?? '').trim().toLowerCase() === 'approved';

const getHBLApprovalValidationMessage = (
  hbls: HouseBill[],
): string | null => {
  if (hbls.length === 0) {
    return NO_HBL_FOUND_ERROR_PREFIX;
  }

  const nonApproved = hbls.filter((hbl) => !isApprovedHBL(hbl));
  if (nonApproved.length === 0) {
    return null;
  }

  const details = nonApproved
    .map((hbl) => `${hbl.code || hbl.id} (${formatHBLStatus(hbl.status)})`)
    .join(', ');
  return `${NON_APPROVED_HBL_ERROR_PREFIX} Non-approved HBLs: ${details}`;
};

const isHBLApprovalValidationError = (error?: { type?: unknown; message?: string }) =>
  error?.type === 'manual' &&
  Boolean(
    error.message?.startsWith(NON_APPROVED_HBL_ERROR_PREFIX) ||
    error.message?.startsWith(NO_HBL_FOUND_ERROR_PREFIX),
  );

export const ContainerRow: React.FC<ContainerRowProps> = ({
  index,
  formMode = 'create',
  onRemove,
  canRemove,
  isReadOnly = false,
  isExpanded,
  onToggleExpand,
  shouldAutoFocus = false,
  onLoadingStateChange,
  forwarders,
  onUpdatePlan,
  isPlanUpdateDisabled = false,
  isDuplicatePair = false,
}) => {

  const {
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState,
  } = useFormContext<BookingOrderCreateForm>();

  // Ref for the container number picker
  const containerPickerRef = useRef<ContainerNumberPickerHandle | null>(null);

  // Track which container/seal combination was last used to hydrate HBLs
  const hblLoadedCombinationRef = useRef<string | null>(null);
  const lastAutoEtaRef = useRef<string | null>(null);
  const lastIssuerMismatchKeyRef = useRef<string | null>(null);
  const lastVesselVoyageMismatchKeyRef = useRef<string | null>(null);
  const lastApprovalValidationKeyRef = useRef<string | null>(null);

  // Watch container values (must be called before using them)
  const containerNo = watch(`containers.${index}.containerNo`) || '';
  const containerId = watch(`containers.${index}.containerId`) || '';
  const typeCode = watch(`containers.${index}.typeCode`) || '';
  const sealNumber = watch(`containers.${index}.sealNumber`) || '';
  const baseAgentId = watch('agentId') || '';
  const currentAgentCode = watch('agentCode');
  const currentVesselCode = watch('vesselCode') || '';
  const currentVoyage = watch('voyage') || '';
  const currentEta = watch('eta');
  const currentPol = watch('pol' as any);
  const currentPod = watch('pod' as any);
  const mblNumber = watch(`containers.${index}.mblNumber`);
  const cargoReleaseStatus = watch(`containers.${index}.cargoReleaseStatus`);
  const isPriority = watch(`containers.${index}.isPriority`) || false;
  const isAtYard = watch(`containers.${index}.isAtYard`) || false;
  const yardFreeFrom = watch(`containers.${index}.yardFreeFrom`);
  const yardFreeTo = watch(`containers.${index}.yardFreeTo`);
  const cargoNature = watch(`containers.${index}.cargoNature`) as CargoNature | undefined;
  const cargoProperties = watch(`containers.${index}.cargoProperties`);
  const hblsRaw = watch(`containers.${index}.hbls`);
  const hbls = useMemo(() => hblsRaw ?? [], [hblsRaw]);
  const isDangerousGoods = cargoNature === 'DG';
  const isOutOfGauge = cargoNature === 'OOG';
  const dangerousGoodsProps = isDangerousGoodsProperties(cargoProperties) ? cargoProperties : null;
  const isFlashPointRequired = Boolean(dangerousGoodsProps?.imoClass === '3');
  const shouldHideFields = true;
  const isImportDerivedReadOnly = true;
  const issuerMismatchMessage = 'This container belongs to a different forwarder than the first container.';
  const vesselVoyageMismatchMessage =
    'This container belongs to a different vessel/voyage than the first container.';
  const isIssuerMismatchError = (error?: { type?: unknown; message?: string }) =>
    error?.type === 'manual' && error?.message === issuerMismatchMessage;
  const isVesselVoyageMismatchError = (error?: { type?: unknown; message?: string }) =>
    error?.type === 'manual' && error?.message === vesselVoyageMismatchMessage;

  React.useEffect(() => {
    if (isReadOnly) {
      return;
    }

    if (cargoNature === 'DG') {
      if (cargoProperties && !isDangerousGoodsProperties(cargoProperties)) {
        setValue(`containers.${index}.cargoProperties`, null, { shouldDirty: true });
      }
    } else if (cargoNature === 'OOG') {
      if (cargoProperties && !isOutOfGaugeProperties(cargoProperties)) {
        setValue(`containers.${index}.cargoProperties`, null, { shouldDirty: true });
      }
    } else if (cargoProperties) {
      setValue(`containers.${index}.cargoProperties`, null, { shouldDirty: true });
    }
  }, [cargoNature, cargoProperties, index, isReadOnly, setValue]);

  // Track container validation error from form state
  const containerNoError = formState.errors?.containers?.[index]?.containerNo;
  const sealNumberError = formState.errors?.containers?.[index]?.sealNumber;
  const containerError = containerNoError?.message;
  const isManualContainerNoError = containerNoError?.type === 'manual';
  const hblApprovalValidationMessage = isHBLApprovalValidationError(containerNoError)
    ? containerNoError.message
    : isHBLApprovalValidationError(sealNumberError)
      ? sealNumberError.message
      : undefined;

  // Fetch container details if containerId exists (to populate typeCode in collapsed row)
  const { data: containerDetails } = useContainer(containerId || '');

  // Fetch HBLs matching the container + seal combination
  const {
    matchingHBLs,
    isLoading: isInitialLoadingHBLs,
    isFetching: isFetchingHBLs,
    refetch: refetchHBLs,
  } = useContainerHBLs(containerNo, sealNumber);

  // Notify parent of loading state changes
  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(index, isFetchingHBLs);
    }
  }, [index, isFetchingHBLs, onLoadingStateChange]);

  // Update typeCode when container details are fetched
  useEffect(() => {
    if (containerDetails && containerDetails.containerTypeCode && !typeCode) {
      setValue(`containers.${index}.typeCode`, containerDetails.containerTypeCode);
    }
  }, [containerDetails, typeCode, index, setValue]);

  // Clear HBLs immediately when container becomes invalid
  useEffect(() => {
    if (isReadOnly) {
      return; // Don't clear HBLs in read-only mode
    }

    // Don't clear HBLs for duplicate warnings (manual errors) - we only want to block save.
    if (containerError && hbls.length > 0 && !isManualContainerNoError) {
      setValue(`containers.${index}.hbls`, []);
      toastAdapter.warning('HBLs cleared due to invalid container');
    }
  }, [containerError, hbls.length, index, isManualContainerNoError, setValue, isReadOnly]);

  // Auto-populate HBLs when container/seal changes (CREATE/EDIT mode)
  useEffect(() => {
    const resetImportDerivedOrderFields = () => {
      if (index !== 0) return;
      if (baseAgentId) {
        setValue('agentId', '', { shouldDirty: true });
      }
      if (currentAgentCode !== undefined) {
        setValue('agentCode', undefined, { shouldDirty: true });
      }
      if (currentVesselCode) {
        setValue('vesselCode', '', { shouldDirty: true });
      }
      if (currentVoyage) {
        setValue('voyage', '', { shouldDirty: true });
      }
      if (currentPol !== null && currentPol !== undefined) {
        setValue('pol' as any, null, { shouldDirty: true });
      }
      if (currentPod !== null && currentPod !== undefined) {
        setValue('pod' as any, null, { shouldDirty: true });
      }
    };

    // Skip if read-only
    if (isReadOnly) {
      return;
    }

    // If we don't have both container and seal, clear HBLs and reset refs
    if (!containerNo || !sealNumber) {
      if (hbls.length > 0) {
        setValue(`containers.${index}.hbls`, []);
      }
      hblLoadedCombinationRef.current = null;
      lastAutoEtaRef.current = null;
      lastIssuerMismatchKeyRef.current = null;
      lastVesselVoyageMismatchKeyRef.current = null;
      lastApprovalValidationKeyRef.current = null;

      if (isHBLApprovalValidationError(containerNoError)) {
        clearErrors(`containers.${index}.containerNo`);
      }
      if (isHBLApprovalValidationError(sealNumberError)) {
        clearErrors(`containers.${index}.sealNumber`);
      }
      return;
    }

    if (isFetchingHBLs) {
      return;
    }

    // Helper to format HBLs from API data
    // Copy cargo metadata from container to each HBL
    const formatHBLs = () => matchingHBLs.map((hbl) => ({
      hblId: hbl.id,
      hblNo: hbl.code,
      receivedAt: hbl.receivedAt,
      issuerId: hbl.issuerId,
      issuerName: hbl.issuer?.name || '',
      shipper: hbl.shipper,
      consignee: hbl.consignee,
      pol: hbl.pol,
      pod: hbl.pod,
      vesselName: hbl.vesselName,
      voyageNumber: hbl.voyageNumber,
      packages: hbl.packageCount,
      customsStatus: hbl.customsStatus,
      cargoNature: cargoNature,
      cargoProperties: cargoProperties,
    }));

    const combinationKey = `${containerNo}|${sealNumber}`;
    const previousCombination = hblLoadedCombinationRef.current;
    const approvalValidationMessage = getHBLApprovalValidationMessage(
      matchingHBLs as HouseBill[],
    );

    if (approvalValidationMessage) {
      setValue(`containers.${index}.hbls`, []);
      setValue(`containers.${index}.mblNumber`, null, { shouldDirty: true });
      resetImportDerivedOrderFields();

      if (
        containerNoError?.type !== 'manual' ||
        containerNoError.message !== approvalValidationMessage
      ) {
        setError(`containers.${index}.containerNo`, {
          type: 'manual',
          message: approvalValidationMessage,
        });
      }
      if (
        sealNumberError?.type !== 'manual' ||
        sealNumberError.message !== approvalValidationMessage
      ) {
        setError(`containers.${index}.sealNumber`, {
          type: 'manual',
          message: approvalValidationMessage,
        });
      }

      const validationKey = `${combinationKey}|${approvalValidationMessage}`;
      if (lastApprovalValidationKeyRef.current !== validationKey) {
        toastAdapter.warning(approvalValidationMessage);
        lastApprovalValidationKeyRef.current = validationKey;
      }

      lastIssuerMismatchKeyRef.current = null;
      lastVesselVoyageMismatchKeyRef.current = null;
      hblLoadedCombinationRef.current = combinationKey;
      return;
    }

    if (isHBLApprovalValidationError(containerNoError)) {
      clearErrors(`containers.${index}.containerNo`);
    }
    if (isHBLApprovalValidationError(sealNumberError)) {
      clearErrors(`containers.${index}.sealNumber`);
    }
    lastApprovalValidationKeyRef.current = null;

    // Clear existing HBLs and load new matching HBLs
    if (matchingHBLs.length > 0) {
      const eligibleHbl = matchingHBLs[0];
      const eligibleIssuerId = eligibleHbl?.issuerId;

      if (index > 0 && baseAgentId && eligibleIssuerId && eligibleIssuerId !== baseAgentId) {
        setValue(`containers.${index}.hbls`, []);
        setValue(`containers.${index}.mblNumber`, null, { shouldDirty: true });
        if (!isIssuerMismatchError(containerNoError)) {
          setError(`containers.${index}.containerNo`, {
            type: 'manual',
            message: issuerMismatchMessage,
          });
        }
        if (!isIssuerMismatchError(sealNumberError)) {
          setError(`containers.${index}.sealNumber`, {
            type: 'manual',
            message: issuerMismatchMessage,
          });
        }
        const mismatchKey = `${containerNo}|${sealNumber}|${baseAgentId}|${eligibleIssuerId}`;
        if (lastIssuerMismatchKeyRef.current !== mismatchKey) {
          toastAdapter.error(issuerMismatchMessage);
          lastIssuerMismatchKeyRef.current = mismatchKey;
        }
        hblLoadedCombinationRef.current = combinationKey;
        return;
      }

      const normalizeText = (value: string | null | undefined) =>
        (value ?? '').trim().toLowerCase();
      const baseVessel = normalizeText(currentVesselCode);
      const baseVoyage = normalizeText(currentVoyage);

      if (index > 0 && baseVessel && baseVoyage) {
        const mismatchingHbl = matchingHBLs.find((hbl) => {
          const vessel = normalizeText(hbl.vesselName);
          const voyage = normalizeText(hbl.voyageNumber);
          return vessel !== baseVessel || voyage !== baseVoyage;
        });

        if (mismatchingHbl) {
          setValue(`containers.${index}.hbls`, []);
          setValue(`containers.${index}.mblNumber`, null, { shouldDirty: true });
          if (!isVesselVoyageMismatchError(containerNoError)) {
            setError(`containers.${index}.containerNo`, {
              type: 'manual',
              message: vesselVoyageMismatchMessage,
            });
          }
          if (!isVesselVoyageMismatchError(sealNumberError)) {
            setError(`containers.${index}.sealNumber`, {
              type: 'manual',
              message: vesselVoyageMismatchMessage,
            });
          }

          const mismatchKey = [
            containerNo,
            sealNumber,
            baseVessel,
            baseVoyage,
            normalizeText(mismatchingHbl.vesselName),
            normalizeText(mismatchingHbl.voyageNumber),
          ].join('|');

          if (lastVesselVoyageMismatchKeyRef.current !== mismatchKey) {
            toastAdapter.error(vesselVoyageMismatchMessage);
            lastVesselVoyageMismatchKeyRef.current = mismatchKey;
          }

          hblLoadedCombinationRef.current = combinationKey;
          return;
        }
      }

      if (containerNoError?.type === 'manual' && containerNoError.message === issuerMismatchMessage) {
        clearErrors(`containers.${index}.containerNo`);
      }
      if (sealNumberError?.type === 'manual' && sealNumberError.message === issuerMismatchMessage) {
        clearErrors(`containers.${index}.sealNumber`);
      }
      if (
        containerNoError?.type === 'manual' &&
        containerNoError.message === vesselVoyageMismatchMessage
      ) {
        clearErrors(`containers.${index}.containerNo`);
      }
      if (
        sealNumberError?.type === 'manual' &&
        sealNumberError.message === vesselVoyageMismatchMessage
      ) {
        clearErrors(`containers.${index}.sealNumber`);
      }
      lastIssuerMismatchKeyRef.current = null;
      lastVesselVoyageMismatchKeyRef.current = null;
      setValue(`containers.${index}.hbls`, formatHBLs());

      // Import flow: hydrate MBL number from first eligible HBL
      setValue(`containers.${index}.mblNumber`, eligibleHbl?.mbl ?? null, { shouldDirty: true });

      // Import flow: first eligible HBL of the first container drives base order fields in create mode.
      if (formMode === 'create' && index === 0 && eligibleHbl && eligibleHbl.issuerId) {
        if (baseAgentId !== eligibleHbl.issuerId) {
          setValue('agentId', eligibleHbl.issuerId, { shouldDirty: true });
        }

        const forwarderCode = forwarders?.find((f) => f.id === eligibleHbl.issuerId)?.code;
        if (forwarderCode && forwarderCode !== currentAgentCode) {
          setValue('agentCode', forwarderCode, { shouldDirty: true });
        }

        if (eligibleHbl.vesselName && eligibleHbl.vesselName !== currentVesselCode) {
          setValue('vesselCode', eligibleHbl.vesselName, { shouldDirty: true });
        }
        if (eligibleHbl.voyageNumber && eligibleHbl.voyageNumber !== currentVoyage) {
          setValue('voyage', eligibleHbl.voyageNumber, { shouldDirty: true });
        }
        if (eligibleHbl.eta && eligibleHbl.eta !== currentEta) {
          const shouldAutoSetEta =
            previousCombination !== combinationKey ||
            !currentEta ||
            (lastAutoEtaRef.current && currentEta === lastAutoEtaRef.current);

          if (shouldAutoSetEta) {
            setValue('eta', eligibleHbl.eta, { shouldDirty: true });
            lastAutoEtaRef.current = eligibleHbl.eta;
          }
        }
        const nextPol = eligibleHbl.pol ?? null;
        const nextPod = eligibleHbl.pod ?? null;
        if (nextPol !== currentPol) {
          setValue('pol' as any, nextPol, { shouldDirty: true });
        }
        if (nextPod !== currentPod) {
          setValue('pod' as any, nextPod, { shouldDirty: true });
        }
      }
    }

    hblLoadedCombinationRef.current = combinationKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    baseAgentId,
    cargoNature,
    cargoProperties,
    clearErrors,
    containerNoError,
    containerNo,
    currentAgentCode,
    currentEta,
    currentPod,
    currentPol,
    currentVesselCode,
    currentVoyage,
    formMode,
    forwarders,
    index,
    isFetchingHBLs,
    isReadOnly,
    issuerMismatchMessage,
    matchingHBLs,
    sealNumberError,
    sealNumber,
    setError,
    setValue,
  ]);

  // Enrich HBL data when viewing existing orders (VIEW mode)
  useEffect(() => {
    // Only run in read-only mode (view mode)
    if (!isReadOnly) {
      return;
    }

    // Need container, seal, and existing HBLs to enrich
    if (!containerNo || !sealNumber || hbls.length === 0) {
      return;
    }

    // Check if HBLs need enrichment (missing detail fields)
    const needsEnrichment = hbls.some((hbl) =>
      (
        !hbl.receivedAt &&
        !hbl.issuerName &&
        !hbl.shipper &&
        !hbl.consignee
      ) ||
      !hbl.customsStatus
    );

    if (!needsEnrichment) {
      return; // HBLs already have data
    }

    // Enrich HBL data by cross-referencing with full HBL data from API
    // Also add cargo metadata from container
    if (matchingHBLs.length > 0) {
      const enrichedHBLs = hbls.map((existingHBL) => {
        // Find matching HBL from API data
        const fullHBL = matchingHBLs.find((hbl) => hbl.id === existingHBL.hblId);

        if (fullHBL) {
          // Merge existing HBL with full data and cargo metadata from container
          return {
            ...existingHBL,
            hblNo: fullHBL.code,
            receivedAt: fullHBL.receivedAt,
            issuerId: fullHBL.issuerId,
            issuerName: fullHBL.issuer?.name || '',
            shipper: fullHBL.shipper,
            consignee: fullHBL.consignee,
            pol: fullHBL.pol,
            pod: fullHBL.pod,
            vesselName: fullHBL.vesselName,
            voyageNumber: fullHBL.voyageNumber,
            packages: fullHBL.packageCount,
            customsStatus: fullHBL.customsStatus,
            cargoNature: cargoNature,
            cargoProperties: cargoProperties,
          };
        }

        // No match found, keep existing data but add cargo metadata
        return {
          ...existingHBL,
          cargoNature: cargoNature,
          cargoProperties: cargoProperties,
        };
      });

      const hasChanges = enrichedHBLs.some((enrichedHBL, hblIndex) =>
        JSON.stringify(enrichedHBL) !== JSON.stringify(hbls[hblIndex]),
      );

      if (hasChanges) {
        // Update form state with enriched data only when something actually changed
        setValue(`containers.${index}.hbls`, enrichedHBLs);
      }
    }
  }, [isReadOnly, containerNo, sealNumber, hbls, matchingHBLs, index, setValue, cargoNature, cargoProperties]);

  // Use layoutEffect to focus synchronously after render, before browser paint
  useLayoutEffect(() => {
    if (shouldAutoFocus && isExpanded && containerPickerRef.current) {
      containerPickerRef.current.focus();
    }
  }, [shouldAutoFocus, isExpanded]);

  // Format date range
  const formatDateRange = (from: string | null | undefined, to: string | null | undefined) => {
    if (!from && !to) return '—';
    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return '';
      }
    };
    const fromStr = formatDate(from);
    const toStr = formatDate(to);
    if (fromStr && toStr) return `${fromStr} - ${toStr}`;
    if (fromStr) return `From ${fromStr}`;
    if (toStr) return `Until ${toStr}`;
    return '—';
  };

  // HBL count display
  const hblCountDisplay = () => {
    if (hbls.length === 0) {
      return (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          No HBLs yet
        </span>
      );
    }
    return (
      <span className="text-green-600 dark:text-green-400 font-medium">
        {hbls.length} HBL
      </span>
    );
  };

  const handleRemove = async () => {
    if (isReadOnly) return;

    const confirmMessage = containerNo
      ? `Remove container ${containerNo}?`
      : `Remove container #${index + 1}?`;

    const confirmed = await toastAdapter.confirm(confirmMessage, {
      intent: 'danger',
    });

    if (confirmed) {
      onRemove(index);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Collapsed Row */}
      <div
        className={`grid grid-cols-[auto_1.5fr_0.8fr_1.2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
          isExpanded ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'
        }`}
        onClick={onToggleExpand}
      >
        {/* Expand/Collapse Icon + # */}
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {index + 1}
          </span>
        </div>

        {/* Container No */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {containerNo || <span className="text-gray-400 italic">Not set</span>}
            </span>
            {isDuplicatePair && !isReadOnly && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
                title="Duplicate container + seal"
              >
                <AlertTriangle className="h-3 w-3" />
                Duplicate
              </span>
            )}
          </div>
        </div>

        {/* Type */}
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {typeCode || '—'}
          </span>
        </div>

        {/* Seal */}
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {sealNumber || '—'}
          </span>
        </div>

        {/* MBL Number */}
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {mblNumber || '—'}
          </span>
        </div>

        {/* Priority + Yard Status */}
        <div className="flex flex-col items-center gap-1">
          {isPriority ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Priority
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs text-gray-500 dark:text-gray-400">
              Regular
            </span>
          )}
          {isAtYard && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              At Yard
            </span>
          )}
        </div>

        {/* Cargo Release Status */}
        <div className="flex justify-center">
          {cargoReleaseStatus && (
            <ContainerStatusBadge status={cargoReleaseStatus} type="cargo" />
          )}
        </div>

        {/* Yard Free Period */}
        <div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatDateRange(yardFreeFrom, yardFreeTo)}
          </span>
        </div>

        {/* HBL Count */}
        <div className="flex justify-center text-xs">
          {hblCountDisplay()}
        </div>

        {/* Actions */}
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onUpdatePlan?.(index)}
            className="p-1 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
            title="Update plan"
            disabled={isPlanUpdateDisabled}
          >
            <ClipboardList className="w-4 h-4" />
          </button>
          {canRemove && !isReadOnly && (
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Remove container"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-6">
            {isDuplicatePair && !isReadOnly && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>
                  Container number and seal number combination must be unique.
                </span>
              </div>
            )}
            {/* Main Grid: Left (Container Info) + Right (Details) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Container Number, Type, Seal */}
              <div className="space-y-4 lg:col-span-1">
                <Controller
                  name={`containers.${index}.containerNo`}
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <ContainerNumberPicker
                      ref={containerPickerRef}
                      value={{
                        id: containerId || null,
                        number: field.value || '',
                        typeCode: typeCode || null,
                      }}
                      onChange={(containerValue) => {
                        field.onChange(containerValue.number);
                        setValue(`containers.${index}.typeCode`, containerValue.typeCode || '');
                        setValue(`containers.${index}.containerId`, containerValue.id || '');
                      }}
                      onResolved={({ value }) => {
                        field.onChange(value.number);
                        setValue(`containers.${index}.typeCode`, value.typeCode || '');
                        setValue(`containers.${index}.containerId`, value.id || '');
                      }}
                      error={error?.message}
                      disabled={isReadOnly}
                      required
                      allowCreateWhenNotFound={false}
                    />
                  )}
                />

                <FormInput
                  name={`containers.${index}.sealNumber`}
                  control={control}
                  label="Seal Number"
                  placeholder="SEAL123456"
                  required
                  disabled={isReadOnly}
                />

                <FormInput
                  name={`containers.${index}.mblNumber`}
                  control={control}
                  label="MBL Number"
                  placeholder="Enter MBL Number (optional)"
                  disabled={isReadOnly || isImportDerivedReadOnly}
                />
              </div>

              {/* Right Column: Container Details (2 sub-columns) */}
              <div className="space-y-4 lg:col-span-2">
                {/* Row 1: Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormCheckbox
                    name={`containers.${index}.isPriority`}
                    control={control}
                    label="High Priority"
                    helpText="Mark for expedited processing"
                    disabled={isReadOnly}
                  />
                </div>

                {/* Row 2: Status Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <FormSingleSelect
                    name={`containers.${index}.cargoReleaseStatus`}
                    control={control}
                    label="Cargo Release Status"
                    options={Object.entries(CARGO_RELEASE_STATUS_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    disabled={isReadOnly || isImportDerivedReadOnly}
                  />
                </div>

                {/* Row 3: Cargo Nature */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ display: shouldHideFields ? 'none' : undefined }}>
                  <FormSingleSelect
                    name={`containers.${index}.cargoNature`}
                    control={control}
                    label="Cargo Nature"
                    options={cargoNatureOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    placeholder="Select cargo nature"
                    disabled={isReadOnly}
                  />
                </div>

                {isDangerousGoods && (
                  <div className="border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/10 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Dangerous Goods Details
                      </p>
                      <span className="text-xs text-red-600 dark:text-red-300">
                        Required for DG cargo
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormSingleSelect
                        name={`containers.${index}.cargoProperties.imoClass`}
                        control={control}
                        label="IMO Class"
                        required
                        options={imoClassOptions.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                        placeholder="Select IMO class"
                        disabled={isReadOnly}
                      />

                      <FormInput
                        name={`containers.${index}.cargoProperties.unNumber`}
                        control={control}
                        label="UN Number"
                        placeholder="UN 1203"
                        required
                        disabled={isReadOnly}
                      />

                      <FormInput
                        name={`containers.${index}.cargoProperties.dgPage`}
                        control={control}
                        label="DG Page"
                        placeholder="Vol.2 p.324"
                        disabled={isReadOnly}
                      />

                      <FormInput
                        name={`containers.${index}.cargoProperties.flashPoint`}
                        control={control}
                        label="Flash Point"
                        placeholder="+23°C"
                        required={isFlashPointRequired}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                )}

                {isOutOfGauge && (
                  <div className="border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Out of Gauge Details
                      </p>
                      <span className="text-xs text-amber-600 dark:text-amber-300">
                        Description required for OOG cargo
                      </span>
                    </div>
                    <FormTextarea
                      name={`containers.${index}.cargoProperties.oogDescription`}
                      control={control}
                      label="OOG Description"
                      rows={3}
                      required
                      disabled={isReadOnly}
                      placeholder="Enter cargo dimensions or overhang details"
                    />
                  </div>
                )}

                {/* Row 3: Yard Free Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ display: shouldHideFields ? 'none' : undefined }}>
                  <FormDateInput
                    name={`containers.${index}.yardFreeFrom`}
                    control={control}
                    label="Yard Free From"
                    disabled={isReadOnly}
                  />

                  <FormDateInput
                    name={`containers.${index}.yardFreeTo`}
                    control={control}
                    label="Yard Free To"
                    disabled={isReadOnly}
                  />
                </div>

                {/* Row 4: Extraction Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div hidden={shouldHideFields}>
                    <FormDateInput
                      name={`containers.${index}.extractFrom`}
                      control={control}
                      label="Extract From"
                      disabled={isReadOnly}
                    />
                  </div>

                  <FormDateInput
                    name={`containers.${index}.extractTo`}
                    control={control}
                    label="Extract To (Deadline)"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>

            {/* HBL Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <HBLTable
                containerIndex={index}
                isReadOnly={isReadOnly}
                isImportFlow={true}
                isLoadingHBLs={isFetchingHBLs}
                containerNumber={containerNo}
                sealNumber={sealNumber}
                onRefresh={containerNo && sealNumber ? () => refetchHBLs() : undefined}
                isRefreshing={isFetchingHBLs && !isInitialLoadingHBLs}
                forwarders={forwarders}
                validationWarning={hblApprovalValidationMessage}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContainerRow;
