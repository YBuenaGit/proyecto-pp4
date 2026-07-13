import assert from "node:assert/strict";
import test from "node:test";
import { ROLES } from "../../src/lib/constants";
import { notificationDestinationModulesForUser, shouldRestrictDeadlineNotificationsToOwn } from "../../src/lib/notification-rules";

test("directivo recibe solo derivaciones destinadas a directivo y conserva todos los plazos", () => {
  const user = { role: ROLES.directivo };

  assert.deepEqual(notificationDestinationModulesForUser(user), ["DIRECTIVO"]);
  assert.equal(shouldRestrictDeadlineNotificationsToOwn(), false);
});

test("admin conserva todas las derivaciones y no restringe plazos", () => {
  const user = { role: ROLES.admin };

  assert.deepEqual(notificationDestinationModulesForUser(user), ["DESPACHO", "JURIDICO", "DIRECTIVO"]);
  assert.equal(shouldRestrictDeadlineNotificationsToOwn(), false);
});

test("despacho y juridico ven solo derivaciones de su modulo", () => {
  assert.deepEqual(notificationDestinationModulesForUser({ role: ROLES.despacho }), ["DESPACHO"]);
  assert.deepEqual(notificationDestinationModulesForUser({ role: ROLES.juridico }), ["JURIDICO"]);
  assert.equal(shouldRestrictDeadlineNotificationsToOwn(), false);
});
