export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

// Argentina no aplica horario de verano desde 2009. Los valores de los
// controles datetime-local no incluyen zona horaria, por lo que se debe
// adjuntar explicitamente el offset argentino antes de convertirlos a Date.
const ARGENTINA_UTC_OFFSET = "-03:00";
const dateKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const dateTimeLocalPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const argentinaPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ARGENTINA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function dateParts(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = argentinaPartsFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

export function isArgentinaDateKey(value: string | null | undefined): value is string {
  if (!value) return false;
  const match = dateKeyPattern.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const candidate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  return (
    candidate.getUTCFullYear() === Number(year) &&
    candidate.getUTCMonth() === Number(month) - 1 &&
    candidate.getUTCDate() === Number(day)
  );
}

export function parseArgentinaDate(value: string) {
  if (!isArgentinaDateKey(value)) return new Date(Number.NaN);
  return new Date(`${value}T00:00:00.000${ARGENTINA_UTC_OFFSET}`);
}

export function parseArgentinaDateTime(value: string) {
  const trimmed = value.trim();
  const match = dateTimeLocalPattern.exec(trimmed);
  if (!match) return new Date(trimmed);

  const [, year, month, day, hour, minute, second = "00"] = match;
  if (
    !isArgentinaDateKey(`${year}-${month}-${day}`) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  ) {
    return new Date(Number.NaN);
  }

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.000${ARGENTINA_UTC_OFFSET}`);
}

export function toArgentinaDateKey(value: Date | string = new Date()) {
  const { year, month, day } = dateParts(value);
  return `${year}-${month}-${day}`;
}

export function toArgentinaMonthKey(value: Date | string = new Date()) {
  const { year, month } = dateParts(value);
  return `${year}-${month}`;
}

export function argentinaYear(value: Date | string = new Date()) {
  return Number(dateParts(value).year);
}

export function toArgentinaDateTimeInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const { year, month, day, hour, minute } = dateParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function addArgentinaDateKeyDays(dateKey: string, amount: number) {
  if (!isArgentinaDateKey(dateKey)) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function argentinaDayRange(dateKey = toArgentinaDateKey()) {
  const start = parseArgentinaDate(dateKey);
  const nextDateKey = addArgentinaDateKeyDays(dateKey, 1);
  const endExclusive = parseArgentinaDate(nextDateKey);
  return { start, endExclusive };
}

