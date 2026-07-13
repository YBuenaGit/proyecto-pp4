import assert from "node:assert/strict";
import test from "node:test";
import { ROLES } from "../../src/lib/constants";
import {
  canRecordReferralView,
  isInternalReferralModule,
  referralIdsToMarkForLegajo,
  referralDestinationModuleForRole,
} from "../../src/lib/referral-view-rules";

test("mapea cada rol receptor a su modulo exacto", () => {
  assert.equal(referralDestinationModuleForRole(ROLES.despacho), "DESPACHO");
  assert.equal(referralDestinationModuleForRole(ROLES.juridico), "JURIDICO");
  assert.equal(referralDestinationModuleForRole(ROLES.directivo), "DIRECTIVO");
  assert.equal(referralDestinationModuleForRole(ROLES.admin), null);
});

test("solo el rol destino puede registrar el visto", () => {
  assert.equal(
    canRecordReferralView({
      userId: "juridico-receptor",
      userRole: ROLES.juridico,
      destinationModule: "JURIDICO",
      referredById: "despacho-remitente",
    }),
    true,
  );
  assert.equal(
    canRecordReferralView({
      userId: "directivo",
      userRole: ROLES.directivo,
      destinationModule: "JURIDICO",
      referredById: "despacho-remitente",
    }),
    false,
  );
  assert.equal(
    canRecordReferralView({
      userId: "admin",
      userRole: ROLES.admin,
      destinationModule: "DESPACHO",
      referredById: "juridico-remitente",
    }),
    false,
  );
});

test("el remitente no confirma su propia derivacion", () => {
  assert.equal(
    canRecordReferralView({
      userId: "juridico-remitente",
      userRole: ROLES.juridico,
      destinationModule: "JURIDICO",
      referredById: "juridico-remitente",
    }),
    false,
  );
});

test("identifica unicamente modulos internos con comprobante", () => {
  assert.equal(isInternalReferralModule("DESPACHO"), true);
  assert.equal(isInternalReferralModule("JURIDICO"), true);
  assert.equal(isInternalReferralModule("DIRECTIVO"), true);
  assert.equal(isInternalReferralModule("TRANSITO"), false);
});

test("solo marca derivaciones vinculadas con el legajo abierto", () => {
  const referrals = [
    {
      id: "juridico-destino",
      destinationModule: "JURIDICO",
      referredById: "despacho-remitente",
      viewedAt: null,
      originDispatchRecordId: "despacho-origen",
      originJuridicalInterventionId: null,
      destinationDispatchRecordId: null,
      destinationJuridicalInterventionId: "juridico-abierto",
    },
    {
      id: "juridico-otro",
      destinationModule: "JURIDICO",
      referredById: "despacho-remitente",
      viewedAt: null,
      originDispatchRecordId: "despacho-otro",
      originJuridicalInterventionId: null,
      destinationDispatchRecordId: null,
      destinationJuridicalInterventionId: "juridico-otro",
    },
  ];

  assert.deepEqual(
    referralIdsToMarkForLegajo({
      referrals,
      userId: "juridico-receptor",
      userRole: ROLES.juridico,
      legajoModule: "JURIDICO",
      legajoId: "juridico-abierto",
    }),
    ["juridico-destino"],
  );
});

test("directivo confirma desde el legajo de origen", () => {
  const referral = {
    id: "directivo-destino",
    destinationModule: "DIRECTIVO",
    referredById: "juridico-remitente",
    viewedAt: null,
    originDispatchRecordId: null,
    originJuridicalInterventionId: "juridico-origen",
    destinationDispatchRecordId: null,
    destinationJuridicalInterventionId: null,
  };

  assert.deepEqual(
    referralIdsToMarkForLegajo({
      referrals: [referral],
      userId: "directivo-receptor",
      userRole: ROLES.directivo,
      legajoModule: "JURIDICO",
      legajoId: "juridico-origen",
    }),
    ["directivo-destino"],
  );
});
