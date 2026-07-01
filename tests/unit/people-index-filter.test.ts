import assert from "node:assert/strict";
import test from "node:test";
import { matchesPeopleFilters, type PeopleIndexEntry } from "../../src/lib/people-index";

const person: PeopleIndexEntry = {
  id: "p-test",
  key: "dni:12345678",
  dni: "12345678",
  firstName: "Mart\u00edn",
  lastName: "Bacal\u00edn",
  firstNameSearchText: "Mart\u00edn",
  lastNameSearchText: "Bacal\u00edn",
  nameSearchText: "Bacal\u00edn Mart\u00edn",
  displayName: "Bacal\u00edn Mart\u00edn",
  phone1: null,
  phone2: null,
  address: null,
  roles: ["DENUNCIANTE"],
  cases: [],
  caseCount: 0,
  latestCase: null,
  updatedAt: null,
  externalPersonIds: [],
};

test("filtra apellido y nombre en sus campos correctos ignorando acentos", () => {
  assert.equal(matchesPeopleFilters(person, { dni: "12345678" }), true);
  assert.equal(matchesPeopleFilters(person, { lastName: "Bacalin" }), true);
  assert.equal(matchesPeopleFilters(person, { firstName: "Martin" }), true);
  assert.equal(matchesPeopleFilters(person, { lastName: "Martin" }), false);
  assert.equal(matchesPeopleFilters(person, { firstName: "Bacalin" }), false);
});

test("filtra apellido y nombre completo aunque se escriba en otro orden", () => {
  assert.equal(matchesPeopleFilters(person, { name: "Bacalin Martin" }), true);
  assert.equal(matchesPeopleFilters(person, { name: "Martin Bacalin" }), true);
  assert.equal(matchesPeopleFilters(person, { name: "Miriam Bacalin" }), false);
});

test("filtra contra todas las variantes cargadas para el mismo DNI", () => {
  const mixedPerson: PeopleIndexEntry = {
    ...person,
    firstName: "Roca",
    lastName: "Mirian",
    displayName: "Mirian Roca",
    firstNameSearchText: "Roca Mirian",
    lastNameSearchText: "Mirian Roca",
    nameSearchText: "Mirian Roca Roca Mirian",
  };

  assert.equal(matchesPeopleFilters(mixedPerson, { firstName: "Mirian" }), true);
  assert.equal(matchesPeopleFilters(mixedPerson, { firstName: "Roca" }), true);
  assert.equal(matchesPeopleFilters(mixedPerson, { lastName: "Mirian" }), true);
  assert.equal(matchesPeopleFilters(mixedPerson, { lastName: "Roca" }), true);
  assert.equal(matchesPeopleFilters(mixedPerson, { name: "Roca Mirian" }), true);
});
