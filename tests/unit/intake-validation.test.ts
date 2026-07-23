import assert from "node:assert/strict";
import test from "node:test";
import {
  hasIntakeComplainantData,
  hasIntakeComplainantResolution,
  hasIntakeLinkedPersonData,
  hasIntakeLinkedPersonResolution,
  hasIntakePeopleResolution,
} from "../../src/lib/intake-validation";

test("personas vacias no resuelven el paso de atencion", () => {
  const complainant = {
    isAnonymous: false,
    dni: "",
    firstName: "  ",
    lastName: "",
    phone1: "",
    phone2: "",
    address: "",
  };
  const linkedPerson = {
    dni: "",
    firstName: "",
    apellidoApodoManual: "",
    phone1: "",
    phone2: "",
    address: "",
  };

  assert.equal(hasIntakeComplainantData(complainant), false);
  assert.equal(hasIntakeLinkedPersonData(linkedPerson), false);
  assert.equal(hasIntakeComplainantResolution([complainant]), false);
  assert.equal(
    hasIntakeLinkedPersonResolution({
      linkedPersons: [linkedPerson],
      noLinkedPerson: false,
    }),
    false,
  );
  assert.equal(
    hasIntakePeopleResolution({
      complainants: [complainant],
      linkedPersons: [linkedPerson],
      noLinkedPerson: false,
    }),
    false,
  );
});

test("el paso exige denunciante y resolucion de persona vinculada", () => {
  assert.equal(
    hasIntakePeopleResolution({
      complainants: [{ isAnonymous: true }],
      linkedPersons: [],
      noLinkedPerson: false,
    }),
    false,
  );
  assert.equal(
    hasIntakePeopleResolution({
      complainants: [],
      linkedPersons: [{ firstName: "Maria" }],
      noLinkedPerson: false,
    }),
    false,
  );
  assert.equal(
    hasIntakePeopleResolution({
      complainants: [],
      linkedPersons: [],
      noLinkedPerson: true,
    }),
    false,
  );
  assert.equal(
    hasIntakePeopleResolution({
      complainants: [{ isAnonymous: true }],
      linkedPersons: [],
      noLinkedPerson: true,
    }),
    true,
  );
  assert.equal(
    hasIntakePeopleResolution({
      complainants: [{ firstName: "Ana" }],
      linkedPersons: [{ firstName: "Maria" }],
      noLinkedPerson: false,
    }),
    true,
  );
});
