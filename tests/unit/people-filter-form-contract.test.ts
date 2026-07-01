import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const filterBarSource = readFileSync(
  new URL("../../src/components/ui/filter-bar.tsx", import.meta.url),
  "utf8",
);
const peoplePageSource = readFileSync(
  new URL("../../src/app/(app)/personas/page.tsx", import.meta.url),
  "utf8",
);

test("los filtros nativos envian contra la ruta limpia para no duplicar parametros", () => {
  assert.match(filterBarSource, /action=\{onSubmit \? undefined : resetHref\}/);
  assert.match(filterBarSource, /method=\{onSubmit \? undefined : "get"\}/);
  assert.match(filterBarSource, /if \(onSubmit\) close\?\.\(\);/);
  assert.match(filterBarSource, /clearFormControls\(event\.currentTarget\.closest\("form"\)\)/);
  assert.match(filterBarSource, /clearFormControls\(event\.currentTarget\.form\)/);
  assert.match(filterBarSource, /onReset\?\.\(\);/);
  assert.doesNotMatch(filterBarSource, /onSubmit\?\.\(event\);\s*close\?\.\(\);/);
  assert.doesNotMatch(filterBarSource, /<LinkButton href=\{resetHref\} variant="secondary" onClick=\{onReset\}>/);
  assert.doesNotMatch(filterBarSource, /window\.location\.assign/);
});

test("personas no muestra ni aplica el filtro de caso", () => {
  assert.doesNotMatch(peoplePageSource, /name="case"/);
  assert.doesNotMatch(peoplePageSource, /caseQuery/);
});
