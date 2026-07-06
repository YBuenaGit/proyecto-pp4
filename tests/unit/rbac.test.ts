import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessAdmin,
  canAccessDispatch,
  canAccessExpedients,
  canAccessJuridical,
  canAccessPeople,
  canAccessReports,
  canAccessRetentions,
  canBypassLegajoRestriction,
  visibleModules,
} from "../../src/lib/rbac";

const executiveUser = {
  id: "directivo-1",
  name: "Andrea Puig",
  username: "directivo",
  email: "andrea@example.test",
  role: "directivo",
  active: true,
};

const adminUser = {
  id: "admin-1",
  name: "Administrador Sistema",
  username: "admin",
  email: "admin@example.test",
  role: "admin",
  active: true,
};

const dispatchUser = {
  id: "despacho-1",
  name: "Despacho",
  username: "despacho",
  email: "despacho@example.test",
  role: "despacho",
  active: true,
};

const juridicalUser = {
  id: "juridico-1",
  name: "Juridico",
  username: "juridico",
  email: "juridico@example.test",
  role: "juridico",
  active: true,
};

test("directivo accede a los modulos operativos pero no a administracion", () => {
  assert.equal(canAccessDispatch(executiveUser), true);
  assert.equal(canAccessJuridical(executiveUser), true);
  assert.equal(canAccessExpedients(executiveUser), true);
  assert.equal(canAccessPeople(executiveUser), true);
  assert.equal(canAccessReports(executiveUser), true);
  assert.equal(canAccessRetentions(executiveUser), true);
  assert.equal(canAccessAdmin(executiveUser), false);
  assert.deepEqual(visibleModules(executiveUser), {
    agenda: true,
    despacho: true,
    juridico: true,
    expedientes: true,
    personas: true,
    reportes: true,
    retenciones: true,
    administracion: false,
  });
});

test("admin accede a todos los modulos operativos y a administracion", () => {
  assert.equal(canAccessDispatch(adminUser), true);
  assert.equal(canAccessJuridical(adminUser), true);
  assert.equal(canAccessExpedients(adminUser), true);
  assert.equal(canAccessPeople(adminUser), true);
  assert.equal(canAccessReports(adminUser), true);
  assert.equal(canAccessRetentions(adminUser), true);
  assert.equal(canAccessAdmin(adminUser), true);
  assert.deepEqual(visibleModules(adminUser), {
    agenda: true,
    despacho: true,
    juridico: true,
    expedientes: true,
    personas: true,
    reportes: true,
    retenciones: true,
    administracion: true,
  });
});

test("solo directivo y admin saltean restricciones de legajos derivados", () => {
  assert.equal(canBypassLegajoRestriction(executiveUser), true);
  assert.equal(canBypassLegajoRestriction(adminUser), true);
  assert.equal(canBypassLegajoRestriction(dispatchUser), false);
  assert.equal(canBypassLegajoRestriction(juridicalUser), false);
  assert.equal(canBypassLegajoRestriction(null), false);
});
