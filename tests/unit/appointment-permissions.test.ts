import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateAppointment,
  canDeleteAppointment,
  canEditAppointment,
  canViewAppointment,
  getAllowedAgendaViewScopes,
  getGroupCalendarScopes,
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

test("directivo incorpora una agenda grupal exclusiva", () => {
  const appointment = {
    calendarScope: "lawyers",
    ownerUserId: "otra-persona",
    createdByUserId: "otra-persona",
    assignedLawyerId: "otra-persona",
    assignedArea: "lawyers",
  };
  const directorsAppointment = {
    calendarScope: "directors",
    ownerUserId: null,
    createdByUserId: "otro-directivo",
  };

  assert.deepEqual(getAllowedAgendaViewScopes(executiveUser), ["personal", "directors", "lawyers", "dispatch", "all"]);
  assert.deepEqual(getGroupCalendarScopes(executiveUser), ["directors"]);
  assert.equal(canCreateAppointment(executiveUser, "personal"), true);
  assert.equal(canCreateAppointment(executiveUser, "directors"), true);
  assert.equal(canCreateAppointment(executiveUser, "lawyers"), true);
  assert.equal(canCreateAppointment(executiveUser, "dispatch"), true);
  assert.equal(canViewAppointment(executiveUser, appointment), true);
  assert.equal(canViewAppointment(executiveUser, directorsAppointment), true);
  assert.equal(canEditAppointment(executiveUser, appointment), true);
  assert.equal(canEditAppointment(executiveUser, directorsAppointment), true);
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
  assert.equal(canCreateAppointment(adminUser, "directors"), false);
  assert.equal(canCreateAppointment(adminUser, "lawyers"), true);
  assert.equal(canCreateAppointment(adminUser, "dispatch"), true);
  assert.equal(canViewAppointment(adminUser, appointment), true);
  assert.equal(canEditAppointment(adminUser, appointment), true);
  assert.equal(canDeleteAppointment(adminUser, appointment), true);
  assert.equal(
    canViewAppointment(adminUser, {
      calendarScope: "directors",
      createdByUserId: executiveUser.id,
    }),
    false,
  );
});

test("la agenda de directivos queda oculta para los demas roles", () => {
  const directorsAppointment = {
    calendarScope: "directors",
    createdByUserId: executiveUser.id,
  };

  assert.equal(canViewAppointment(juridicalUser, directorsAppointment), false);
  assert.equal(canViewAppointment(adminUser, directorsAppointment), false);
});

test("cada rol recibe notificaciones de su propia agenda grupal", () => {
  const dispatchUser = { ...juridicalUser, id: "despacho-1", role: "despacho" };

  assert.deepEqual(getGroupCalendarScopes(juridicalUser), ["lawyers"]);
  assert.deepEqual(getGroupCalendarScopes(dispatchUser), ["dispatch"]);
  assert.deepEqual(getGroupCalendarScopes(executiveUser), ["directors"]);
  assert.deepEqual(getGroupCalendarScopes(adminUser), ["lawyers", "dispatch"]);
});
