import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dispatchFormSource = readFileSync(
  new URL(
    "../../src/app/(app)/despacho/dispatch-wizard-form.tsx",
    import.meta.url,
  ),
  "utf8",
);
const dispatchInitialValuesSource = readFileSync(
  new URL("../../src/app/(app)/despacho/dispatch-form.tsx", import.meta.url),
  "utf8",
);
const dispatchActionsSource = readFileSync(
  new URL("../../src/app/(app)/despacho/actions.ts", import.meta.url),
  "utf8",
);
const juridicalFormSource = readFileSync(
  new URL(
    "../../src/app/(app)/intervenciones/intervention-form.tsx",
    import.meta.url,
  ),
  "utf8",
);
const juridicalActionsSource = readFileSync(
  new URL("../../src/app/(app)/intervenciones/actions.ts", import.meta.url),
  "utf8",
);

test("despacho permite guardar una atencion sin persona denunciada", () => {
  assert.match(dispatchFormSource, /noLinkedPerson: boolean/);
  assert.match(dispatchFormSource, /No hay persona denunciada o vinculada/);
  assert.match(dispatchFormSource, /name="noLinkedPerson"/);
  assert.match(
    dispatchFormSource,
    /values\.noLinkedPerson\s*\? \[\]\s*: values\.linkedPersons\.filter/,
  );
  assert.match(
    dispatchInitialValuesSource,
    /record && linkedPersons\.length === 0 && !hasLegacyLinkedPerson/,
  );
  assert.equal(
    dispatchActionsSource.match(
      /const linkedPersons = noLinkedPerson \? \[\] : parseLinkedPersons\(formData\);/g,
    )?.length,
    2,
  );
});

test("juridico permite guardar una intervencion sin persona denunciada", () => {
  assert.match(juridicalFormSource, /noLinkedPerson: boolean/);
  assert.match(juridicalFormSource, /No hay persona denunciada o vinculada/);
  assert.match(juridicalFormSource, /name="noLinkedPerson"/);
  assert.match(
    juridicalFormSource,
    /values\.noLinkedPerson\s*\? \[\]\s*: values\.linkedPersons\.filter/,
  );
  assert.match(
    juridicalFormSource,
    /record &&\s*!record\.linkedPersons\?\.length/,
  );
  assert.equal(
    juridicalActionsSource.match(
      /const linkedPersons = noLinkedPerson \? \[\] : parseLinkedPersons\(formData\);/g,
    )?.length,
    2,
  );
});

test("ambos formularios muestran el estado vacio en la confirmacion", () => {
  const emptyState = /Sin personas denunciadas o vinculadas cargadas\./;
  assert.match(dispatchFormSource, emptyState);
  assert.match(juridicalFormSource, emptyState);
});
