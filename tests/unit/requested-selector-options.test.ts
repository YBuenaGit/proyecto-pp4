import assert from "node:assert/strict";
import test from "node:test";
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPES,
} from "../../src/lib/appointment-constants";
import {
  CATALOG_SELECTOR_ITEMS,
} from "../../src/lib/catalog-selector-definitions";
import {
  DISPATCH_CATEGORY_LABELS,
  DISPATCH_FORM_EXCLUDED_CATEGORIES,
  DISPATCH_INTERNAL_DERIVED_AREAS,
  JURIDICAL_DERIVED_AREAS,
} from "../../src/lib/constants";

test("agenda incorpora los nuevos tipos de evento para todos los roles", () => {
  const expected = {
    CAPACITACION: "Capacitación",
    CUMPLEANOS: "Cumpleaños",
    DIAS_FESTIVOS: "Días festivos",
    EVENTOS_MUNI: "Eventos Muni",
    MUNI_EN_TU_BARRIO: "Muni en tu barrio",
  } as const;

  for (const [value, label] of Object.entries(expected)) {
    assert.equal((APPOINTMENT_TYPES as readonly string[]).includes(value), true);
    assert.equal(APPOINTMENT_TYPE_LABELS[value as keyof typeof APPOINTMENT_TYPE_LABELS], label);
  }
});

test("despacho actualiza categoria y areas del formulario", () => {
  assert.equal(
    DISPATCH_CATEGORY_LABELS.PEDIDO_ACTA_TRIBUNAL_FALTA,
    "Pedido de acta por tribunal de falta",
  );
  assert.equal(DISPATCH_CATEGORY_LABELS.OTROS, "Otros");
  assert.equal(
    (DISPATCH_FORM_EXCLUDED_CATEGORIES as readonly string[]).includes(
      "DERIVACION_AREA",
    ),
    true,
  );

  const areaLabels = DISPATCH_INTERNAL_DERIVED_AREAS.map((item) => item.label);
  assert.equal(areaLabels.includes("Honorable tribunal de falta"), true);
  assert.equal(areaLabels.includes("Oficios judiciales"), true);

  const requestedAreas = [
    "Hacienda",
    "Recursos Humanos",
    "Saneamiento",
    "Catastro",
    "Policia de la Provincia",
  ];
  const dispatchAreaLabels = CATALOG_SELECTOR_ITEMS.filter(
    (item) => item.type === "dispatch_area",
  ).map((item) => item.label);

  for (const area of requestedAreas) {
    assert.equal(dispatchAreaLabels.includes(area), true);
    assert.equal(JURIDICAL_DERIVED_AREAS.includes(area), true);
  }
});
