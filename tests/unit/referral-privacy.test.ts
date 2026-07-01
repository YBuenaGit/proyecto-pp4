import assert from "node:assert/strict";
import test from "node:test";
import { earliestDate, isVisibleBeforeReferralCutoff } from "../../src/lib/referral-privacy";

test("calcula el primer corte de privacidad disponible", () => {
  const first = new Date("2026-06-01T10:00:00Z");
  const second = new Date("2026-06-01T11:00:00Z");

  assert.equal(earliestDate([null, second, first])?.getTime(), first.getTime());
});

test("oculta entradas posteriores salvo el registro de derivacion", () => {
  const cutoff = new Date("2026-06-01T10:00:00Z");
  const before = { createdAt: new Date("2026-06-01T09:59:00Z"), type: "SEGUIMIENTO" };
  const after = { createdAt: new Date("2026-06-01T10:01:00Z"), type: "SEGUIMIENTO" };
  const derivation = { createdAt: new Date("2026-06-01T10:01:00Z"), type: "DERIVACION" };

  assert.equal(isVisibleBeforeReferralCutoff(before, cutoff, (item) => item.type === "DERIVACION"), true);
  assert.equal(isVisibleBeforeReferralCutoff(after, cutoff, (item) => item.type === "DERIVACION"), false);
  assert.equal(isVisibleBeforeReferralCutoff(derivation, cutoff, (item) => item.type === "DERIVACION"), true);
});
