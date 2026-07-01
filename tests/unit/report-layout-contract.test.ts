import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reportsPageSource = readFileSync(
  new URL("../../src/app/(app)/reportes/page.tsx", import.meta.url),
  "utf8",
);
const tableSource = readFileSync(
  new URL("../../src/components/ui/table.tsx", import.meta.url),
  "utf8",
);

test("reportes usa solo el marco interno de la tabla para los contadores", () => {
  assert.match(reportsPageSource, /<Table title=\{title\}/);
  assert.doesNotMatch(reportsPageSource, /import \{ DetailSection \}/);
  assert.doesNotMatch(reportsPageSource, /<DetailSection title=\{title\}/);
});

test("el filtro y refresh de reportes no pierden los parametros activos", () => {
  assert.match(reportsPageSource, /<form action="\/reportes" method="get" className="space-y-4">/);
  assert.match(tableSource, /router\.refresh\(\);/);
  assert.doesNotMatch(tableSource, /router\.replace\(pathname\)/);
});
