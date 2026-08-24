/** Shared formatting. Everything renders in the browser's locale with a UK fallback. */

const LOCALE = "en-GB";

/** What a cell shows with no value. A word, because a dash in a column of marks reads as zero. */
export const NOT_SET = "Not set";

export function formatDate(value: string | Date | null | undefined, fallback = NOT_SET): string {
  if (!value) return fallback;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(
  value: string | Date | null | undefined,
  fallback = NOT_SET,
): string {
  if (!value) return fallback;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** For a deadline: "in 6 days", "due today", "3 days ago". */
export function formatRelativeDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return "No deadline set";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `In ${days} days`;
  if (days === -1) return "1 day ago";
  return `${Math.abs(days)} days ago`;
}

/** A percentage as the API stores it: two decimals, trailing zeros trimmed. */
export function formatPercent(value: number | null | undefined, fallback = NOT_SET): string {
  if (value === null || value === undefined) return fallback;
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}%`;
}

export function formatNumber(value: number | null | undefined, fallback = NOT_SET): string {
  if (value === null || value === undefined) return fallback;
  return value.toLocaleString(LOCALE);
}

export function formatFileSize(bytes: number | null | undefined, fallback = NOT_SET): string {
  if (bytes === null || bytes === undefined) return fallback;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "1 project", "3 projects". Pass a plural where adding an s is wrong. */
export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Turns a snake_case value into something readable when there is no label map. */
export function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
