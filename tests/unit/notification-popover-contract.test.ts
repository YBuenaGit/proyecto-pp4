import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notificationBellSource = readFileSync(
  new URL("../../src/components/layout/notification-bell.tsx", import.meta.url),
  "utf8",
);

test("el panel de notificaciones ocupa el ancho disponible solo en celulares", () => {
  assert.match(notificationBellSource, /absolute right-0 top-full/);
  assert.match(notificationBellSource, /w-\[min\(23rem,calc\(100vw-1\.5rem\)\)\]/);
  assert.match(notificationBellSource, /max-sm:fixed/);
  assert.match(notificationBellSource, /max-sm:inset-x-3/);
  assert.match(notificationBellSource, /max-sm:w-auto/);
});

test("la lista se desplaza dentro de la altura disponible en celulares", () => {
  assert.match(notificationBellSource, /max-sm:max-h-\[calc\(100dvh-4\.25rem\)\]/);
  assert.match(notificationBellSource, /max-sm:flex-col/);
  assert.match(notificationBellSource, /max-sm:flex-1/);
  assert.match(notificationBellSource, /max-sm:max-h-none/);
  assert.match(notificationBellSource, /max-h-\[70vh\]/);
  assert.match(notificationBellSource, /max-h-\[26rem\]/);
});
