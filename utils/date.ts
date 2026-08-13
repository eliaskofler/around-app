/** Local-time date helpers. Days are identified by a `YYYY-MM-DD` key. */

export type DateKey = string;

/**
 * How many days before today the day pager loads up front (`app/index.tsx`)
 * — it grows further back on its own as the user swipes toward the edge, so
 * this is just the initial window.
 */
export const PAGER_DAYS_BEFORE_TODAY = 10;

export function toDateKey(date: Date): DateKey {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfToday(): Date {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date: Date, amount: number): Date {
  // Constructing from parts normalises month/year rollover for us.
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isSameDay(a: Date, b: Date): boolean {
  return isSameMonth(a, b) && a.getDate() === b.getDate();
}

/** Whole days from `from` to `to` — negative if `to` comes before `from`. */
export function daysBetween(from: Date, to: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((to.getTime() - from.getTime()) / millisecondsPerDay);
}

/** Whole days from today to `date` — negative in the past, positive in the future. */
function daysFromToday(date: Date): number {
  return daysBetween(startOfToday(), date);
}

/** "Today" / "Yesterday" / "Tomorrow", falling back to a short date. */
export function formatDayLabel(date: Date): string {
  switch (daysFromToday(date)) {
    case 0:
      return 'Today';
    case -1:
      return 'Yesterday';
    case 1:
      return 'Tomorrow';
    default:
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}

export function formatFullDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
