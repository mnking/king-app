import type {
  CargoPackageSelectionItem,
  ConditionStatus,
  LocationGroup,
  RegulatoryStatus,
} from '../types';

const toTitle = (value?: string | null): string =>
  value ? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

export const getPrimaryLocationId = (pkg: CargoPackageSelectionItem): string | null => {
  const firstLocationId = pkg.currentLocationId?.find((locationId) => Boolean(locationId));
  return firstLocationId ?? null;
};

export const groupPackagesByLocation = (
  packages: CargoPackageSelectionItem[],
  locationNameLookup: Map<string, string>,
): LocationGroup[] => {
  const map = new Map<string, LocationGroup>();

  packages.forEach((pkg) => {
    const locationId = getPrimaryLocationId(pkg);
    const key = locationId ?? '__unassigned__';
    const existing = map.get(key);

    if (existing) {
      existing.items.push(pkg);
      return;
    }

    map.set(key, {
      key,
      locationId,
      locationName: locationId ? locationNameLookup.get(locationId) ?? locationId : 'Unassigned',
      items: [pkg],
    });
  });

  return Array.from(map.values()).sort((a, b) => a.locationName.localeCompare(b.locationName));
};

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/60',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60',
  danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800/60',
};

export const conditionBadge = (status?: ConditionStatus | null) => {
  if (status == null) {
    return { label: '—', className: toneClasses.neutral as string };
  }

  if (status === 'NORMAL') {
    return { label: 'Normal', className: toneClasses.success as string };
  }

  if (status === 'PACKAGE_DAMAGED') {
    return { label: 'Package Damaged', className: toneClasses.warning as string };
  }

  if (status === 'CARGO_DAMAGED') {
    return { label: 'Cargo Damaged', className: toneClasses.danger as string };
  }

  return { label: toTitle(status), className: toneClasses.neutral as string };
};

export const regulatoryBadge = (status?: RegulatoryStatus | null) => {
  if (status === 'PASSED') {
    return { label: 'Passed', className: toneClasses.success as string };
  }

  if (status === 'ON_HOLD') {
    return { label: 'On Hold', className: toneClasses.warning as string };
  }

  if (status === 'UNINSPECTED') {
    return { label: 'Uninspected', className: toneClasses.neutral as string };
  }

  return { label: toTitle(status), className: toneClasses.neutral as string };
};

export const formatStatusLabel = toTitle;
