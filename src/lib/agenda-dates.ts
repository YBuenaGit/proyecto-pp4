export type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isDateKey(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function isMonthKey(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

export function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function monthKeyToDate(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function formatLongMonth(monthKey: string) {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(monthKeyToDate(monthKey));
}

export function formatDayTitle(dateKey: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateKeyToDate(dateKey));
}

export function getMonthRange(monthKey: string) {
  const firstDay = monthKeyToDate(monthKey);
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
  return {
    monthStart: toDateKey(firstDay),
    monthEnd: toDateKey(lastDay),
  };
}

export function addMonths(monthKey: string, amount: number) {
  const base = monthKeyToDate(monthKey);
  return toMonthKey(new Date(base.getFullYear(), base.getMonth() + amount, 1));
}

export function firstDayOfMonth(monthKey: string) {
  return `${monthKey}-01`;
}

export function buildCalendarDays(monthKey: string): CalendarDay[] {
  const firstOfMonth = monthKeyToDate(monthKey);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      dateKey: toDateKey(date),
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === firstOfMonth.getMonth(),
    };
  });
}
