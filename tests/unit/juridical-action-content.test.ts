import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJuridicalActionContent,
  parseJuridicalActionContent,
  parseJuridicalActionContentForDisplay,
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
  assert.deepEqual(
    parseJuridicalActionContent("Registro historico sin secciones."),
    {
      description: "Registro historico sin secciones.",
      guidanceProvided: "",
      nextStepDescription: "",
    },
  );
});

test("muestra derivaciones sin el detalle interno del resumen", () => {
  assert.deepEqual(
    parseJuridicalActionContentForDisplay(
      "Derivacion a Intervenciones: Intervenciones del legajo, test 01",
      "DERIVACION",
    ),
    {
      description: "Derivacion a Intervenciones",
      guidanceProvided: "",
      nextStepDescription: "",
    },
  );
});
