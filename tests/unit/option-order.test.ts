import assert from "node:assert/strict";
import test from "node:test";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPES,
} from "../../src/lib/appointment-constants";
import {
  ACTION_TYPES,
  DISPATCH_INTERNAL_DERIVED_AREAS,
  DISPATCH_STATUSES,
  EXPEDIENT_AREAS,
  EXPEDIENT_STATUSES,
  JURIDICAL_DERIVED_AREAS,
  JURIDICAL_STATUSES,
  PRIORITIES,
} from "../../src/lib/constants";
import { BRANDS, COLORS, RETENTION_STATUSES, VEHICLE_TYPES } from "../../src/lib/retentions";
import { sortByLabel } from "../../src/lib/text";

function readableLabel(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .replaceAll("_", " ")
    .replace(/^./u, (letter) => letter.toLocaleUpperCase("es-AR"));
}

function assertVisibleOrder<T>(items: readonly T[], label: (item: T) => string) {
  assert.deepEqual([...items], sortByLabel(items, label));
}

test("mantiene alfabeticos los selectores globales y deja Otro al final", () => {
  assertVisibleOrder(DISPATCH_STATUSES, readableLabel);
  assertVisibleOrder(JURIDICAL_STATUSES, readableLabel);
  assertVisibleOrder(EXPEDIENT_STATUSES, readableLabel);
  assertVisibleOrder(PRIORITIES, readableLabel);
  assertVisibleOrder(ACTION_TYPES, readableLabel);
  assertVisibleOrder(EXPEDIENT_AREAS, (item) => item.label);
  assertVisibleOrder(DISPATCH_INTERNAL_DERIVED_AREAS, (item) => item.label);
  assertVisibleOrder(JURIDICAL_DERIVED_AREAS, (item) => item);
});

test("mantiene alfabeticos los selectores de agenda y retenciones", () => {
  assertVisibleOrder(APPOINTMENT_TYPES, (item) => APPOINTMENT_TYPE_LABELS[item]);
  assertVisibleOrder(APPOINTMENT_STATUSES, (item) => APPOINTMENT_STATUS_LABELS[item]);
  assertVisibleOrder(VEHICLE_TYPES, (item) => item[1]);
  assertVisibleOrder(RETENTION_STATUSES, (item) => item[1]);
  assertVisibleOrder(BRANDS, (item) => item);
  assertVisibleOrder(COLORS, (item) => item);
});
