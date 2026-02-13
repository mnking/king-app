import { Circle, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  CUSTOMS_STATUS,
  CARGO_RELEASE_STATUS,
  CUSTOMS_STATUS_LABELS,
  CARGO_RELEASE_STATUS_LABELS,
  type CustomsStatus,
  type CargoReleaseStatus,
} from '@/shared/constants/container-status';

interface StatusConfig {
  color: 'gray' | 'blue' | 'amber' | 'green' | 'red';
  icon: LucideIcon;
  label: string;
  ariaLabel: string;
}

// TODO(i18n): Replace labels with translation keys once i18n branch merges
export function getCustomsStatusConfig(status: CustomsStatus | null | undefined): StatusConfig {
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
}

// TODO(i18n): Replace labels with translation keys once i18n branch merges
export function getCargoStatusConfig(status: CargoReleaseStatus | null | undefined): StatusConfig {
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
}
