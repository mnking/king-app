/**
 * Date and Time Utilities
 *
 * Shared utilities for date/time conversion and formatting
 * All functions use UTC timezone to match backend API
 */

/**
 * Convert ISO datetime string to datetime-local format (browser local time).
 *
 * Converts from ISO 8601 format (e.g., "2025-10-19T03:00:00.000Z")
 * to HTML datetime-local input format (e.g., "2025-10-19T10:00").
 * Values are rendered in the user's local time so the UI reflects their clock.
 *
 * @param isoString - ISO 8601 datetime string
 * @returns Formatted string for datetime-local input (YYYY-MM-DDTHH:mm in local time)
 * @throws Error if the input string is not a valid date
 */
export const toDateTimeLocalFormat = (isoString: string): string => {
  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${isoString}`);
  }

  // Format: YYYY-MM-DDTHH:mm (in local time)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Convert datetime-local format (local time) to ISO datetime string (UTC).
 *
 * Accepts HTML datetime-local values (e.g., "2025-10-19T10:00") and converts
 * them to ISO 8601 format (e.g., "2025-10-19T03:00:00.000Z"), interpreting the
 * input as local time chosen by the user so the backend receives UTC.
 *
 * @param dateTimeLocal - Datetime string in format YYYY-MM-DDTHH:mm
 * @returns ISO 8601 datetime string in UTC
 * @throws Error if the input string is not a valid date
 */
export const fromDateTimeLocalFormat = (dateTimeLocal: string): string => {
  const date = new Date(dateTimeLocal);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateTimeLocal}`);
  }

  return date.toISOString();
};

/**
 * Get today's date (based on the user's local timezone) represented as
 * an ISO string at midnight UTC.
 */
export const getLocalTodayAsUtcMidnight = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00.000Z`;
};

/**
 * Normalize any date-like string (e.g. `YYYY-MM-DD` or ISO) into
 * an ISO string in UTC. Returns original input when parsing fails.
 */
export const toUtcISOString = <T extends string | null | undefined>(value: T): T => {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString() as T;
};
