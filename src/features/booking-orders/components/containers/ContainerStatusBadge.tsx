import type { CustomsStatus, CargoReleaseStatus } from '@/shared/constants/container-status';
import { getCustomsStatusConfig, getCargoStatusConfig } from '../../utils/container-status.utils';

interface ContainerStatusBadgeProps {
  status: CustomsStatus | CargoReleaseStatus;
  type: 'customs' | 'cargo';
  className?: string;
}

export function ContainerStatusBadge({ status, type, className = '' }: ContainerStatusBadgeProps) {
  const config = type === 'customs'
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
