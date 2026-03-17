import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
}

const TZ = "America/Chicago";

/** Format any date-like input in America/Chicago timezone with custom Intl options. */
export function formatChicago(
  input: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = input instanceof Date ? input : new Date(input);
  return date.toLocaleString("en-US", { timeZone: TZ, ...options });
}

/** Relative time string ("2h ago", "just now") from any date-like input. */
export function formatTimeAgo(input: string | number | Date): string {
  const then = input instanceof Date ? input.getTime() : new Date(input).getTime();
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/** Short time in Chicago: "3:45 PM" */
export function formatTimeShort(input: string | number | Date): string {
  return formatChicago(input, { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Date + time in Chicago: "Mar 16, 3:45 PM" */
export function formatDateTime(input: string | number | Date): string {
  return formatChicago(input, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function todayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

/**
 * Returns the ISO 8601 week number for a given date string (YYYY-MM-DD).
 * Week 1 is the week containing the first Thursday of the year.
 */
export function getISOWeek(dateStr: string): number {
  const date = new Date(dateStr + "T12:00:00");
  const dayOfWeek = date.getDay() || 7; // Sunday = 7
  date.setDate(date.getDate() + 4 - dayOfWeek); // Set to nearest Thursday
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Returns ISO week label like "W11 (Mar 10–16)" for a date string.
 */
export function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const dayOfWeek = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekNum = getISOWeek(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startLabel = `${months[monday.getMonth()]} ${monday.getDate()}`;
  const endLabel = `${months[sunday.getMonth()]} ${sunday.getDate()}`;

  return `W${weekNum} (${startLabel}\u2013${endLabel})`;
}
