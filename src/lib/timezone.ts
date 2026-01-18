/**
 * Timezone constants and utilities for the Car Washer module.
 * All date/time operations should use these utilities to ensure
 * consistent New York timezone handling regardless of device timezone.
 */

// The canonical timezone for all Car Washer operations
export const APP_TIMEZONE = 'America/New_York';

/**
 * Get the current date in New York timezone as a YYYY-MM-DD string.
 * Use this for queue_date and any date-only comparisons.
 */
export function getTodayInNY(): string {
  const now = new Date();
  const nyDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return nyDate; // Returns YYYY-MM-DD format
}

/**
 * Get the current Date object adjusted to represent "now" in New York.
 * Useful for time displays and comparisons.
 */
export function getNowInNY(): Date {
  const now = new Date();
  const nyString = now.toLocaleString('en-US', { timeZone: APP_TIMEZONE });
  return new Date(nyString);
}

/**
 * Format a date string (YYYY-MM-DD) for display in New York timezone context.
 */
export function formatNYDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00'); // Noon to avoid DST edge cases
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a timestamp for display in New York timezone.
 */
export function formatNYTimestamp(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return null;
  }
}

/**
 * Format a full datetime for display in New York timezone.
 */
export function formatNYDateTime(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return null;
  }
}

/**
 * Check if a given date string (YYYY-MM-DD) is today in New York timezone.
 */
export function isNYToday(dateString: string): boolean {
  return dateString === getTodayInNY();
}

/**
 * Get a Date object for a specific date at midnight in New York timezone.
 * Useful for date range queries.
 */
export function getDateInNY(dateString: string): Date {
  // Parse the date and create it at noon NY time to avoid DST issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 17, 0, 0)); // 17:00 UTC is ~noon ET
  return date;
}

/**
 * Get tomorrow's date in New York timezone as YYYY-MM-DD.
 */
export function getTomorrowInNY(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nyDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);
  return nyDate;
}

/**
 * Get yesterday's date in New York timezone as YYYY-MM-DD.
 */
export function getYesterdayInNY(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const nyDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(yesterday);
  return nyDate;
}
