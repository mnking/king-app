/**
 * Date Formatting Utilities
 * Consistent date/time display formatting across components
 * Format: MM/DD/YYYY, hh:mm AM/PM (user's local timezone)
 */

/**
 * Format a date/time value for display
 * @param date - Date string, Date object, or null/undefined
 * @returns Formatted string "MM/DD/YYYY, hh:mm AM/PM" or fallback
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
}

/**
 * Format a date range for display (e.g., plan start - end times)
 * @param start - Start date
 * @param end - End date
 * @returns Formatted range string
 */
export function formatDateTimeRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string {
  const startStr = formatDateTime(start);
  const endStr = formatDateTime(end);

  if (startStr === '—' && endStr === '—') return '—';
  if (startStr === '—') return `Until ${endStr}`;
  if (endStr === '—') return `From ${startStr}`;

  return `${startStr} – ${endStr}`;
}

/**
 * Format date only (no time)
 * @param date - Date string, Date object, or null/undefined
 * @returns Formatted string "MM/DD/YYYY" or fallback
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Format time only (no date)
 * @param date - Date string, Date object, or null/undefined
 * @returns Formatted string "hh:mm AM/PM" or fallback
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '—';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
}
