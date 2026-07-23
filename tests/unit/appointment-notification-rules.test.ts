import assert from "node:assert/strict";
import test from "node:test";
import { isAppointmentNotificationActive } from "../../src/lib/appointment-notification-rules";

test("activa la notificacion desde el inicio del dia sin depender de la hora de la cita", () => {
  assert.equal(
    isAppointmentNotificationActive({
      date: "2026-07-24",
      status: "PENDIENTE",
      todayKey: "2026-07-23",
    }),
    false,
  );
  assert.equal(
    isAppointmentNotificationActive({
      date: "2026-07-24",
      status: "PENDIENTE",
      todayKey: "2026-07-24",
    }),
    true,
  );
});

test("no notifica citas canceladas ni finalizadas", () => {
  for (const status of ["CANCELADA", "FINALIZADA"]) {
    assert.equal(
      isAppointmentNotificationActive({
        date: "2026-07-24",
        status,
        todayKey: "2026-07-24",
      }),
      false,
    );
  }
});
