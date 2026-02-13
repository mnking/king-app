/**
 * Status Badge Utility
 * Provides consistent status badge configuration across all components
 */

import { STATUS_BADGE_COLORS, type PlanStatus, type BadgeConfig } from '@/shared/constants/badge-colors';

/**
 * Get badge configuration for a plan status
 * @param status - The plan status (SCHEDULED, IN_PROGRESS, DONE, PENDING)
 * @returns Badge configuration or default gray badge if not found
 */
export function getStatusBadgeConfig(status: string | null | undefined): Omit<BadgeConfig, 'icon'> {
  if (!status) {
    return STATUS_BADGE_COLORS.PENDING; // Default to gray
  }

  const config = STATUS_BADGE_COLORS[status as PlanStatus];
  return config || STATUS_BADGE_COLORS.PENDING;
}

/**
 * Get combined className string for a status badge (light + dark mode)
 * @param status - The plan status
 * @returns className string
 */
export function getStatusBadgeClassName(status: string | null | undefined): string {
  const config = getStatusBadgeConfig(status);

  return [
    config.bg,
    config.text,
    config.border ? `border ${config.border}` : '',
    config.darkBg || '',
    config.darkText || '',
    config.darkBorder || '',
  ]
    .filter(Boolean)
    .join(' ');
}
