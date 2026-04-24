import "server-only";

import { randomUUID } from "node:crypto";
import { sqliteExecute, sqliteNow } from "./sqlite";

export async function writeAuditLog(input: {
  module: string;
  entityType: string;
  entityId: string;
  action: string;
  createdById?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await sqliteExecute(
    `INSERT INTO AuditLog (
       id, module, entityType, entityId, action, beforeJson, afterJson, createdById, createdAt
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      input.module,
      input.entityType,
      input.entityId,
      input.action,
      input.before ? JSON.stringify(input.before) : null,
      input.after ? JSON.stringify(input.after) : null,
      input.createdById ?? null,
      sqliteNow(),
    ],
  );
}
