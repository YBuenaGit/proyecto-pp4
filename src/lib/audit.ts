import "server-only";

import { prisma } from "./prisma";

export async function writeAuditLog(input: {
  module: string;
  entityType: string;
  entityId: string;
  action: string;
  createdById?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson: input.before ? JSON.stringify(input.before) : null,
      afterJson: input.after ? JSON.stringify(input.after) : null,
      createdById: input.createdById ?? null,
    },
  });
}
