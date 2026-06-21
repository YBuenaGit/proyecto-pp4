import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJuridicalActionContent,
  parseJuridicalActionContent,
} from "../../src/lib/juridical-action-content";

test("construye y recupera las secciones de una actuacion", () => {
  const expected = {
    description: "Se recibe una ampliacion de la presentacion.",
    guidanceProvided: "Se ordena la documentacion aportada.",
    nextStepDescription: "Contactar al area competente.",
  };

  const serialized = buildJuridicalActionContent(expected);
  assert.deepEqual(parseJuridicalActionContent(serialized), expected);
});

test("mantiene compatibilidad con actuaciones de texto libre", () => {
  assert.deepEqual(parseJuridicalActionContent("Registro historico sin secciones."), {
    description: "Registro historico sin secciones.",
    guidanceProvided: "",
    nextStepDescription: "",
  });
});
