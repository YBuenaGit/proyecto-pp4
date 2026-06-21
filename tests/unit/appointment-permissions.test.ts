import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateAppointment,
  canDeleteAppointment,
  canEditAppointment,
  canViewAppointment,
  getAllowedAgendaViewScopes,
} from "../../src/lib/appointment-permissions";

const juridicalUser = {
  id: "juridico-1",
  name: "Laura Benitez",
  username: "juridico1",
  email: "laura@example.test",
  role: "juridico",
  active: true,
};

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

test("limita agenda personal al propietario y habilita agenda juridica", () => {
  const personalAppointment = {
    calendarScope: "personal",
    ownerUserId: "otra-persona",
    createdByUserId: "otra-persona",
  };
  const juridicalAppointment = {
    calendarScope: "lawyers",
    createdByUserId: juridicalUser.id,
    assignedLawyerId: juridicalUser.id,
    assignedArea: "lawyers",
  };

  assert.equal(canViewAppointment(juridicalUser, personalAppointment), false);
  assert.equal(canViewAppointment(juridicalUser, juridicalAppointment), true);
  assert.equal(canDeleteAppointment(juridicalUser, juridicalAppointment), true);
  assert.deepEqual(getAllowedAgendaViewScopes(juridicalUser), ["personal", "lawyers"]);
});

test("directivo administra cualquier alcance y cita de agenda", () => {
  const appointment = {
    calendarScope: "lawyers",
    ownerUserId: "otra-persona",
    createdByUserId: "otra-persona",
    assignedLawyerId: "otra-persona",
    assignedArea: "lawyers",
  };

  assert.deepEqual(getAllowedAgendaViewScopes(executiveUser), ["personal", "lawyers", "dispatch", "all"]);
  assert.equal(canCreateAppointment(executiveUser, "personal"), true);
  assert.equal(canCreateAppointment(executiveUser, "lawyers"), true);
  assert.equal(canCreateAppointment(executiveUser, "dispatch"), true);
  assert.equal(canViewAppointment(executiveUser, appointment), true);
  assert.equal(canEditAppointment(executiveUser, appointment), true);
  assert.equal(canDeleteAppointment(executiveUser, appointment), true);
});

test("admin administra todos los alcances y citas de agenda", () => {
  const appointment = {
    calendarScope: "dispatch",
    ownerUserId: "otra-persona",
    createdByUserId: "otra-persona",
    assignedUserId: "otra-persona",
    assignedArea: "dispatch",
  };

  assert.deepEqual(getAllowedAgendaViewScopes(adminUser), ["personal", "lawyers", "dispatch", "all"]);
  assert.equal(canCreateAppointment(adminUser, "personal"), true);
  assert.equal(canCreateAppointment(adminUser, "lawyers"), true);
  assert.equal(canCreateAppointment(adminUser, "dispatch"), true);
  assert.equal(canViewAppointment(adminUser, appointment), true);
  assert.equal(canEditAppointment(adminUser, appointment), true);
  assert.equal(canDeleteAppointment(adminUser, appointment), true);
});
