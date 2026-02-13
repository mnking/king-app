/**
 * Cargo Badge Utility
 * Provides consistent cargo nature badge configuration across all components
 */

import { CARGO_BADGE_COLORS, type CargoNature, type BadgeConfig } from '@/shared/constants/badge-colors';

/**
 * Get badge configuration for a cargo nature type
 * @param cargoNature - The cargo nature code (DG, RC, HC, LC, OOG)
 * @returns Badge configuration or null if not found/invalid
 */
export function getCargoBadgeConfig(cargoNature: string | null | undefined): BadgeConfig | null {
  if (!cargoNature) return null;

  const config = CARGO_BADGE_COLORS[cargoNature as CargoNature];
  return config || null;
}

/**
 * Get combined className string for a cargo badge (light + dark mode)
 * @param cargoNature - The cargo nature code
 * @returns className string or empty string if not found
 */
export function getCargoBadgeClassName(cargoNature: string | null | undefined): string {
  const config = getCargoBadgeConfig(cargoNature);
  if (!config) return '';

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
