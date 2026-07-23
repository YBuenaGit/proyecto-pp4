import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const dispatchForm = source(
  "../../src/app/(app)/despacho/dispatch-wizard-form.tsx",
);
const interventionForm = source(
  "../../src/app/(app)/intervenciones/intervention-form.tsx",
);
const dispatchActions = source("../../src/app/(app)/despacho/actions.ts");
const interventionActions = source(
  "../../src/app/(app)/intervenciones/actions.ts",
);

test("ambos formularios exigen denunciante y resolucion de persona vinculada", () => {
  for (const form of [dispatchForm, interventionForm]) {
    assert.match(form, /hasIntakeComplainantResolution/);
    assert.match(form, /hasIntakeLinkedPersonResolution/);
    assert.match(form, /field: "complainantSelection"/);
    assert.match(form, /field: "linkedPersonSelection"/);
    assert.match(form, /data-error-field=/);
    assert.match(
      form,
      /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/,
    );
  }

  for (const actions of [dispatchActions, interventionActions]) {
    assert.match(actions, /hasIntakePeopleResolution/);
    assert.match(actions, /if \(\s*!hasIntakePeopleResolution/);
  }
});

test("nueva intervencion exige relato completo y espera los adjuntos", () => {
  assert.match(
    interventionForm,
    /field: "guidanceProvided"[\s\S]*?obligatoria/,
  );
  assert.match(
    interventionActions,
    /interventionCreationSchema[\s\S]*?guidanceProvided: z\.string\(\)\.trim\(\)\.min\(1\)/,
  );
  assert.match(
    interventionActions,
    /guidanceProvided: parsed\.guidanceProvided/,
  );
  assert.match(interventionForm, /hasIncompleteAttachmentUploads/);
  assert.match(interventionForm, /onUploadStateChange=/);
  assert.match(
    interventionForm,
    /Espera a que terminen todas las cargas de los archivos para continuar\./,
  );
  assert.match(
    interventionForm,
    /disabled=\{\s*!allValid \|\| \(!record && hasIncompleteAttachmentUploads\)/,
  );
});
