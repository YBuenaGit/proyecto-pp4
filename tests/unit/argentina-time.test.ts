import assert from "node:assert/strict";
import test from "node:test";
import {
  argentinaDayRange,
  argentinaYear,
  parseArgentinaDateTime,
  toArgentinaDateKey,
  toArgentinaDateTimeInputValue,
  toArgentinaMonthKey,
} from "../../src/lib/argentina-time";
import { formatDateTime } from "../../src/lib/format";
import { dateRangeWhere } from "../../src/lib/search";

test("interpreta datetime-local como hora civil argentina", () => {
  const date = parseArgentinaDateTime("2026-07-12T19:30");
  assert.equal(date.toISOString(), "2026-07-12T22:30:00.000Z");
  assert.equal(toArgentinaDateTimeInputValue(date), "2026-07-12T19:30");
});

test("formatea instantes siempre en America/Argentina/Buenos_Aires", () => {
  const instant = new Date("2026-07-12T22:30:00.000Z");
  assert.equal(formatDateTime(instant), "12/7/26, 19:30");
  assert.equal(toArgentinaDateKey(instant), "2026-07-12");
  assert.equal(toArgentinaMonthKey(instant), "2026-07");
});

test("calcula hoy y los cortes diarios segun Argentina", () => {
  const instantAfterUtcMidnight = new Date("2026-07-13T01:30:00.000Z");
  assert.equal(toArgentinaDateKey(instantAfterUtcMidnight), "2026-07-12");

  const { start, endExclusive } = argentinaDayRange("2026-07-12");
  assert.equal(start.toISOString(), "2026-07-12T03:00:00.000Z");
  assert.equal(endExclusive.toISOString(), "2026-07-13T03:00:00.000Z");
});

test("los filtros incluyen el dia argentino completo sin depender del servidor", () => {
  const range = dateRangeWhere("2026-07-01", "2026-07-12");
  assert.equal(range?.gte?.toISOString(), "2026-07-01T03:00:00.000Z");
  assert.equal(range?.lt?.toISOString(), "2026-07-13T03:00:00.000Z");
});

test("usa el ano argentino junto al limite de ano UTC", () => {
  assert.equal(argentinaYear("2027-01-01T01:00:00.000Z"), 2026);
  assert.equal(argentinaYear("2027-01-01T03:00:00.000Z"), 2027);
});
