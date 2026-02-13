import { CheckCircle2, Circle, Clock, FileText, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  CARGO_RELEASE_STATUS,
  CARGO_RELEASE_STATUS_LABELS,
  CUSTOMS_STATUS,
  CUSTOMS_STATUS_LABELS,
  type CargoReleaseStatus,
  type CustomsStatus,
} from '@/shared/constants/container-status';

interface PlanningContainerStatusBadgeProps {
  status: CustomsStatus | CargoReleaseStatus;
  type: 'customs' | 'cargo';
  className?: string;
}

interface StatusConfig {
  color: 'gray' | 'blue' | 'amber' | 'green' | 'red';
  icon: LucideIcon;
  label: string;
  ariaLabel: string;
}

const getCustomsStatusConfig = (status: CustomsStatus | null | undefined): StatusConfig => {
  const safeStatus = status || CUSTOMS_STATUS.NOT_REGISTERED;

  const configs: Record<CustomsStatus, StatusConfig> = {
    [CUSTOMS_STATUS.NOT_REGISTERED]: {
      color: 'gray',
      icon: Circle,
      label: CUSTOMS_STATUS_LABELS[CUSTOMS_STATUS.NOT_REGISTERED],
      ariaLabel: 'Customs status: Not registered with customs authority',
    },
    [CUSTOMS_STATUS.REGISTERED]: {
      color: 'blue',
      icon: FileText,
      label: CUSTOMS_STATUS_LABELS[CUSTOMS_STATUS.REGISTERED],
      ariaLabel: 'Customs status: Registered with customs but not under review',
    },
    [CUSTOMS_STATUS.PENDING_APPROVAL]: {
      color: 'amber',
      icon: Clock,
      label: CUSTOMS_STATUS_LABELS[CUSTOMS_STATUS.PENDING_APPROVAL],
      ariaLabel: 'Customs status: Pending customs approval or under inspection',
    },
    [CUSTOMS_STATUS.HAS_CCP]: {
      color: 'green',
      icon: CheckCircle2,
      label: CUSTOMS_STATUS_LABELS[CUSTOMS_STATUS.HAS_CCP],
      ariaLabel: 'Customs status: Has Customs Clearance Permit - fully cleared',
    },
    [CUSTOMS_STATUS.REJECTED]: {
      color: 'red',
      icon: XCircle,
      label: CUSTOMS_STATUS_LABELS[CUSTOMS_STATUS.REJECTED],
      ariaLabel: 'Customs status: Rejected by customs authority',
    },
  };

  return configs[safeStatus];
};

const getCargoStatusConfig = (status: CargoReleaseStatus | null | undefined): StatusConfig => {
  const safeStatus = status || CARGO_RELEASE_STATUS.NOT_REQUESTED;

  const configs: Record<CargoReleaseStatus, StatusConfig> = {
    [CARGO_RELEASE_STATUS.NOT_REQUESTED]: {
      color: 'gray',
      icon: Circle,
      label: CARGO_RELEASE_STATUS_LABELS[CARGO_RELEASE_STATUS.NOT_REQUESTED],
      ariaLabel: 'Cargo release status: Not yet requested',
    },
    [CARGO_RELEASE_STATUS.REQUESTED]: {
      color: 'blue',
      icon: FileText,
      label: CARGO_RELEASE_STATUS_LABELS[CARGO_RELEASE_STATUS.REQUESTED],
      ariaLabel: 'Cargo release status: Release has been requested',
    },
    [CARGO_RELEASE_STATUS.APPROVED]: {
      color: 'green',
      icon: CheckCircle2,
      label: CARGO_RELEASE_STATUS_LABELS[CARGO_RELEASE_STATUS.APPROVED],
      ariaLabel: 'Cargo release status: Approved for release and pickup',
    },
  };

  return configs[safeStatus];
};

export function PlanningContainerStatusBadge({
  status,
  type,
  className = '',
}: PlanningContainerStatusBadgeProps) {
  const config =
    type === 'customs'
      ? getCustomsStatusConfig(status as CustomsStatus)
      : getCargoStatusConfig(status as CargoReleaseStatus);

  const Icon = config.icon;

  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${colorClasses[config.color]} ${className}`}
      aria-label={config.ariaLabel}
      role="status"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

