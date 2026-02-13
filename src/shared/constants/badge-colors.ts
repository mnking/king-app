/**
 * Badge Color Constants
 * Centralized color definitions for cargo nature and status badges
 * to ensure consistency across all components (DRY principle)
 */

import { AlertTriangle, Package, type LucideIcon } from 'lucide-react';

// Cargo Nature Types
export type CargoNature = 'DG' | 'RC' | 'HC' | 'LC' | 'OOG';

// Plan Status Types
export type PlanStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'DONE' | 'PENDING';

// Badge configuration interface
export interface BadgeConfig {
  label: string;
  bg: string;
  text: string;
  border?: string;
  darkBg?: string;
  darkText?: string;
  darkBorder?: string;
  icon?: LucideIcon;
}

/**
 * Cargo nature badge colors
 * DG (Dangerous Goods) = Red (danger)
 * RC (Reefer/Refrigerated) = Blue (cold)
 * HC (Heavy Cargo) = Purple (weight)
 * LC (Liquid Cargo) = Cyan (liquid)
 * OOG (Out of Gauge) = Orange (warning)
 */
export const CARGO_BADGE_COLORS: Record<CargoNature, BadgeConfig> = {
  DG: {
    label: 'DG',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
    darkBorder: 'dark:border-red-700',
    icon: AlertTriangle,
  },
  RC: {
    label: 'Reefer',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    darkBg: 'dark:bg-blue-900/30',
    darkText: 'dark:text-blue-400',
    darkBorder: 'dark:border-blue-700',
    icon: Package,
  },
  HC: {
    label: 'Heavy',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    darkBg: 'dark:bg-purple-900/30',
    darkText: 'dark:text-purple-400',
    darkBorder: 'dark:border-purple-700',
    icon: Package,
  },
  LC: {
    label: 'Liquid',
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-300',
    darkBg: 'dark:bg-cyan-900/30',
    darkText: 'dark:text-cyan-400',
    darkBorder: 'dark:border-cyan-700',
    icon: Package,
  },
  OOG: {
    label: 'OOG',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
    darkBg: 'dark:bg-orange-900/30',
    darkText: 'dark:text-orange-400',
    darkBorder: 'dark:border-orange-700',
    icon: Package,
  },
};

/**
 * Plan status badge colors
 * SCHEDULED = Blue (info/planned)
 * IN_PROGRESS = Yellow (active/working)
 * DONE = Green (success/complete)
 * PENDING = Gray (waiting)
 */
export const STATUS_BADGE_COLORS: Record<PlanStatus, Omit<BadgeConfig, 'icon'>> = {
  SCHEDULED: {
    label: 'Scheduled',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    darkBg: 'dark:bg-blue-900/30',
    darkText: 'dark:text-blue-400',
    darkBorder: 'dark:border-blue-700',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
    darkBg: 'dark:bg-yellow-900/30',
    darkText: 'dark:text-yellow-400',
    darkBorder: 'dark:border-yellow-700',
  },
  DONE: {
    label: 'Done',
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
    darkBorder: 'dark:border-green-700',
  },
  PENDING: {
    label: 'Pending',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    darkBg: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-400',
    darkBorder: 'dark:border-gray-600',
  },
};
