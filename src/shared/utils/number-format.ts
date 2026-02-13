export type NumberFormatOptions = {
  locale?: string;
  useGrouping?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export type ParseNumberOptions = {
  locale?: string;
  allowDecimal?: boolean;
};

const separatorCache = new Map<string, { group: string; decimal: string }>();

const resolveLocale = (locale?: string) =>
  locale ?? new Intl.NumberFormat().resolvedOptions().locale;

const getSeparators = (locale: string) => {
  const cached = separatorCache.get(locale);
  if (cached) return cached;

  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const group = parts.find((part) => part.type === 'group')?.value ?? ',';
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
  const separators = { group, decimal };
  separatorCache.set(locale, separators);
  return separators;
};

export const createNumberFormatter = (options: NumberFormatOptions = {}) => {
  const locale = resolveLocale(options.locale);
  return new Intl.NumberFormat(locale, {
    useGrouping: options.useGrouping ?? true,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  });
};

export const formatNumber = (
  value: number | null | undefined,
  formatter: Intl.NumberFormat,
) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  return formatter.format(value);
};

export const parseLocalizedNumber = (
  value: string,
  options: ParseNumberOptions = {},
) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const locale = resolveLocale(options.locale);
  const { group, decimal } = getSeparators(locale);
  const normalizedGrouping = trimmed.split(group).join('');
  const normalized = options.allowDecimal
    ? normalizedGrouping.replace(decimal, '.').replace(/[^\d.-]/g, '')
    : normalizedGrouping.replace(/[^\d-]/g, '');

  if (!normalized || normalized === '-') return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};
