import { ARGENTINA_TIME_ZONE, toArgentinaDateKey, toArgentinaMonthKey } from "./argentina-time";

export type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

export function toDateKey(date: Date) {
  return toArgentinaDateKey(date);
}

export function toMonthKey(date: Date) {
  return toArgentinaMonthKey(date);
}

export function isDateKey(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function isMonthKey(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

export function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function monthKeyToDate(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 12));
}

export function formatLongMonth(monthKey: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(monthKeyToDate(monthKey));
}

export function formatDayTitle(dateKey: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateKeyToDate(dateKey));
}

export function getMonthRange(monthKey: string) {
  const firstDay = monthKeyToDate(monthKey);
  const lastDay = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0, 12));
  return {
    monthStart: toDateKey(firstDay),
    monthEnd: toDateKey(lastDay),
  };
}

export function addMonths(monthKey: string, amount: number) {
  const base = monthKeyToDate(monthKey);
  return toMonthKey(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + amount, 1, 12)));
}

export function firstDayOfMonth(monthKey: string) {
  return `${monthKey}-01`;
}

export function buildCalendarDays(monthKey: string): CalendarDay[] {
  const firstOfMonth = monthKeyToDate(monthKey);
  const startOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    return {
      dateKey: toDateKey(date),
      dayNumber: date.getUTCDate(),
      inCurrentMonth: date.getUTCMonth() === firstOfMonth.getUTCMonth(),
    };
  });
}
