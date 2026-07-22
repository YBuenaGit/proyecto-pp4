import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const schema = source("../../prisma/schema.prisma");
const dispatchActions = source("../../src/app/(app)/despacho/actions.ts");
const juridicalActions = source(
  "../../src/app/(app)/intervenciones/actions.ts",
);
const dispatchPage = source("../../src/app/(app)/despacho/[id]/page.tsx");
const juridicalPage = source(
  "../../src/app/(app)/intervenciones/[id]/page.tsx",
);
const dispatchForm = source(
  "../../src/app/(app)/despacho/dispatch-wizard-form.tsx",
);
const juridicalForm = source(
  "../../src/app/(app)/intervenciones/intervention-form.tsx",
);
const pdf = source("../../src/lib/legajo-pdf.ts");
const observationComponent = source(
  "../../src/components/ui/legajo-observations.tsx",
);

function functionBody(file: string, name: string, nextExport: string) {
  const start = file.indexOf(`export async function ${name}`);
  const end = file.indexOf(`export async function ${nextExport}`, start + 1);
  assert.notEqual(start, -1, `No se encontro ${name}`);
  assert.notEqual(end, -1, `No se encontro el limite ${nextExport}`);
  return file.slice(start, end);
}

test("las observaciones tienen persistencia inmutable y auditoria", () => {
  assert.match(schema, /model LegajoObservation \{/);
  assert.match(schema, /@@index\(\[module, entityType, entityId, createdAt\]\)/);
  assert.match(dispatchActions, /export async function addDispatchObservation/);
  assert.match(juridicalActions, /export async function addJuridicalObservation/);
  assert.match(dispatchActions, /action: "OBSERVATION"/);
  assert.match(juridicalActions, /action: "OBSERVATION"/);
  assert.doesNotMatch(
    `${dispatchActions}\n${juridicalActions}`,
    /export async function (update|delete).*Observation/,
  );
});

test("no quedan acciones servidoras para editar historia ni borrar adjuntos", () => {
  const actions = `${dispatchActions}\n${juridicalActions}`;
  assert.doesNotMatch(actions, /export async function updateDispatchInitialNarrative/);
  assert.doesNotMatch(actions, /export async function updateDispatchFollowUp/);
  assert.doesNotMatch(actions, /export async function deleteDispatchAttachment/);
  assert.doesNotMatch(actions, /export async function updateJuridicalInitialNarrative/);
  assert.doesNotMatch(actions, /export async function updateJuridicalAction/);
  assert.doesNotMatch(actions, /export async function deleteJuridicalAttachment/);
});

test("la actualizacion general usa una lista permitida y preserva contenidos historicos", () => {
  const dispatchUpdate = functionBody(
    dispatchActions,
    "updateDispatchRecord",
    "addDispatchFollowUp",
  );
  const juridicalUpdate = functionBody(
    juridicalActions,
    "updateJuridicalIntervention",
    "addJuridicalObservation",
  );

  for (const immutableField of [
    "description: parsed",
    "initialGuidance:",
    "confidentialNotes:",
    "referredArea: optional",
  ]) {
    assert.doesNotMatch(dispatchUpdate, new RegExp(immutableField));
  }
  for (const immutableField of [
    "description: parsed",
    "guidanceProvided:",
    "referredToAgency:",
    "confidentialNotes:",
    "derivedArea:",
  ]) {
    assert.doesNotMatch(juridicalUpdate, new RegExp(immutableField));
  }
  assert.match(dispatchUpdate, /include: dispatchAuditInclude/);
  assert.match(juridicalUpdate, /include: juridicalAuditInclude/);
});

test("tabla, modal, libro y PDF consumen observaciones sin controles de edicion", () => {
  for (const page of [dispatchPage, juridicalPage]) {
    assert.match(page, /"Observaciones"/);
    assert.match(page, /LegajoObservationCell/);
    assert.match(page, /LegajoObservationList/);
    assert.doesNotMatch(page, /LegajoActionEditButton/);
  }
  assert.match(pdf, /observations: LegajoPdfObservation\[\]/);
  assert.match(pdf, /Observaciones posteriores/);
});

test("los asistentes tienen un modo explicito que no renderiza relato en edicion general", () => {
  for (const form of [dispatchForm, juridicalForm]) {
    assert.match(form, /"create" \| "general-edit"/);
    assert.match(form, /!isGeneralEdit \? \(/);
    assert.match(form, /Solo se actualizarán Situación, Personas y Estado/);
  }
});

test("el alta de observaciones bloquea dobles envios y admite multiples adjuntos removibles", () => {
  assert.match(observationComponent, /submitLockedRef\.current/);
  assert.match(observationComponent, /disabled=\{isSubmitting\}/);
  assert.match(observationComponent, /<DirectUploadInput/);
  assert.match(observationComponent, /entityType: "LegajoObservation"/);
  assert.match(observationComponent, /scopeId/);
  assert.match(dispatchActions, /entityType: "LegajoObservation"/);
  assert.match(juridicalActions, /entityType: "LegajoObservation"/);
  assert.match(pdf, /attachments: LegajoPdfAttachment\[\]/);
});

test("las tablas de legajo no habilitan desplazamiento horizontal", () => {
  assert.match(dispatchPage, /allowHorizontalScroll=\{false\}/);
  assert.match(juridicalPage, /allowHorizontalScroll=\{false\}/);
  assert.doesNotMatch(observationComponent, /MessageSquarePlus/);
  assert.match(
    observationComponent,
    /triggerClassName="min-h-7 max-w-full whitespace-nowrap px-1\.5 py-1 text-\[10px\]/,
  );
});
