import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  projectAuditChanges,
  type AuditChangeLog,
} from "../../src/lib/audit-changes";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function log(
  input: Partial<AuditChangeLog> &
    Pick<AuditChangeLog, "id" | "action" | "beforeJson" | "afterJson">,
): AuditChangeLog {
  return {
    createdAt: "2026-07-23T12:00:00.000Z",
    createdBy: { name: "Usuario Auditor" },
    ...input,
  };
}

test("proyecta exactamente una fila por cada campo modificado", () => {
  const rows = projectAuditChanges(
    [
      log({
        id: "audit-1",
        action: "UPDATE",
        beforeJson: JSON.stringify({
          expedienteNumber: "123",
          area: "SECRETARIA",
          description: "Texto anterior",
          status: "INICIADO",
        }),
        afterJson: JSON.stringify({
          expedienteNumber: "123",
          area: "GUM",
          description: "Texto nuevo",
          status: "INICIADO",
        }),
      }),
    ],
    [
      { key: "expedienteNumber", label: "Número de expediente" },
      {
        key: "area",
        label: "Área",
        format: (value) => `Área ${String(value)}`,
      },
      { key: "description", label: "Descripción" },
      { key: "status", label: "Estado" },
    ],
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => ({
      field: row.fieldLabel,
      oldValue: row.oldValue,
      newValue: row.newValue,
      modifiedBy: row.modifiedBy,
    })),
    [
      {
        field: "Área",
        oldValue: "Área SECRETARIA",
        newValue: "Área GUM",
        modifiedBy: "Usuario Auditor",
      },
      {
        field: "Descripción",
        oldValue: "Texto anterior",
        newValue: "Texto nuevo",
        modifiedBy: "Usuario Auditor",
      },
    ],
  );
});

test("omite altas, adjuntos, seguimientos y actualizaciones sin diferencias", () => {
  const sameSnapshot = JSON.stringify({
    expedienteNumber: "123",
    status: "INICIADO",
  });
  const rows = projectAuditChanges(
    [
      log({
        id: "create",
        action: "CREATE",
        beforeJson: null,
        afterJson: sameSnapshot,
      }),
      log({
        id: "attachment",
        action: "ATTACHMENT",
        beforeJson: null,
        afterJson: "[]",
      }),
      log({
        id: "follow-up",
        action: "FOLLOW_UP",
        beforeJson: null,
        afterJson: "{}",
      }),
      log({
        id: "no-op",
        action: "UPDATE",
        beforeJson: sameSnapshot,
        afterJson: sameSnapshot,
      }),
    ],
    [
      { key: "expedienteNumber", label: "Número de expediente" },
      { key: "status", label: "Estado" },
    ],
  );

  assert.deepEqual(rows, []);
});

test("recupera cambios desde registros históricos y representa valores vacíos", () => {
  const rows = projectAuditChanges(
    [
      log({
        id: "legacy",
        action: "STATUS_CHANGE",
        beforeJson: JSON.stringify({ observation: null, status: "INICIADO" }),
        afterJson: JSON.stringify({
          observation: "Respuesta agregada",
          status: "EN_TRAMITE",
        }),
        createdBy: null,
      }),
    ],
    [
      { key: "observation", label: "Observación inicial" },
      {
        key: "status",
        label: "Estado",
        format: (value) => String(value).replaceAll("_", " "),
      },
    ],
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.oldValue, "Sin cargar");
  assert.equal(rows[0]?.newValue, "Respuesta agregada");
  assert.equal(rows[0]?.modifiedBy, "Sistema");
  assert.equal(rows[1]?.oldValue, "INICIADO");
  assert.equal(rows[1]?.newValue, "EN TRAMITE");
});

test("expedientes integra seguimiento obligatorio, rollback y auditoría tabular", () => {
  const actions = source("../../src/app/(app)/despacho/actions.ts");
  const detail = source(
    "../../src/app/(app)/despacho/expedientes/[id]/page.tsx",
  );
  const followUps = source(
    "../../src/app/(app)/despacho/expedientes/[id]/expedient-follow-ups.tsx",
  );
  const table = source("../../src/components/ui/audit-change-table.tsx");
  const uploads = source("../../src/lib/direct-uploads.ts");
  const sharedUploads = source("../../src/lib/direct-upload-shared.ts");

  assert.match(actions, /export async function addExpedientFollowUp/);
  assert.match(actions, /await prisma\.\$transaction\(async \(tx\) =>/);
  assert.match(actions, /required: true/);
  assert.match(actions, /transaction: tx/);
  assert.match(actions, /action: "FOLLOW_UP"/);
  assert.match(actions, /if \(!hasChanges\) return/);
  assert.doesNotMatch(
    actions,
    /export async function (update|delete)ExpedientFollowUp/,
  );

  assert.match(detail, /title="Observación inicial"/);
  assert.match(detail, /<ExpedientFollowUps/);
  assert.match(detail, /<AuditChangeTable rows=\{auditRows\}/);
  assert.match(detail, /projectAuditChanges\(auditLogs, auditFields\)/);
  assert.doesNotMatch(detail, /<AuditTimeline/);

  assert.match(followUps, /name="content"/);
  assert.match(followUps, /minLength=\{3\}/);
  assert.match(followUps, /<DirectUploadInput/);
  assert.match(followUps, /scopeEntityType: "InternalExpedient"/);
  assert.match(followUps, /required/);
  assert.match(followUps, /disabled=\{isSubmitting \|\| !uploadsReady\}/);

  assert.match(
    table,
    /"Campo",[\s\S]*"Valor anterior",[\s\S]*"Valor nuevo",[\s\S]*"Modificado por",[\s\S]*"Fecha"/,
  );
  assert.match(sharedUploads, /scopeEntityType\?/);
  assert.match(uploads, /persistedScopeId/);
  assert.match(uploads, /intent\.scopeEntityType === "InternalExpedient"/);
});
