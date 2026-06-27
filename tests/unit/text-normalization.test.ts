import assert from "node:assert/strict";
import test from "node:test";
import {
  capitalizeFirstLetter,
  compareOptionLabels,
  personDisplayName,
  sortByLabel,
} from "../../src/lib/text";

test("capitaliza la primera letra sin alterar identificadores internos", () => {
  assert.equal(capitalizeFirstLetter("  erika cruz  "), "Erika cruz");
  assert.equal(capitalizeFirstLetter("123 calle principal"), "123 Calle principal");
  assert.equal(capitalizeFirstLetter("área jurídica"), "Área jurídica");
});

test("muestra siempre apellido antes del nombre", () => {
  assert.equal(personDisplayName("Cruz Vallejo", "Erika"), "Cruz Vallejo Erika");
  assert.equal(personDisplayName(null, "Erika"), "Erika");
});

test("ordena opciones alfabeticamente y conserva otros al final", () => {
  assert.deepEqual(
    sortByLabel(["Otros", "Zanella", "Ámbar", "Beta"], (item) => item),
    ["Ámbar", "Beta", "Zanella", "Otros"],
  );
  assert.ok(compareOptionLabels("Otros", "Zanella") > 0);
});
