"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DISPATCH_STATUSES, EXPEDIENT_STATUSES, PRIORITIES } from "@/lib/constants";
import { optionalDate, optionalText, text, nextInternalNumber, upsertPersonFromForm } from "@/lib/form";
import { saveAttachments } from "@/lib/files";
import { prisma } from "@/lib/prisma";
import { canAccessDispatch, canAccessExpedients, assertAccess } from "@/lib/rbac";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const dispatchSchema = z.object({
  description: z.string().min(8),
  category: z.string().min(1),
  priority: z.string().refine((value) => PRIORITIES.includes(value)),
  status: z.string().refine((value) => DISPATCH_STATUSES.includes(value)),
});

const expedientSchema = z.object({
  expedienteNumber: z.string().optional().nullable(),
  category: z.string().min(1),
  description: z.string().min(8),
  status: z.string().refine((value) => EXPEDIENT_STATUSES.includes(value)),
});

async function syncDispatchReferralSummary(recordId: string, status: string) {
  await prisma.referral.updateMany({
    where: { destinationDispatchRecordId: recordId },
    data: {
      visibleStatusForOrigin: `Despacho: ${status}`,
      status: ["RESUELTO", "CERRADO", "ARCHIVADO"].includes(status) ? "CERRADA" : "EN_GESTION",
      closedAt: ["RESUELTO", "CERRADO", "ARCHIVADO"].includes(status) ? new Date() : null,
    },
  });
}

export async function createDispatchRecord(formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));

  const parsed = dispatchSchema.parse({
    description: text(formData, "description"),
    category: text(formData, "category"),
    priority: text(formData, "priority") || "MEDIA",
    status: text(formData, "status") || "RECIBIDO",
  });

  const person = await upsertPersonFromForm(formData);
  const attendedAt = optionalDate(formData, "attendedAt") ?? new Date();
  const record = await prisma.dispatchRecord.create({
    data: {
      internalNumber: await nextInternalNumber("DES", "dispatch"),
      attendedAt,
      createdById: user.id,
      personId: person?.id,
      manualPersonName: person ? null : optionalText(formData, "manualPersonName"),
      dniSnapshot: person?.dni ?? optionalText(formData, "dni"),
      nameSnapshot: person ? `${person.firstName} ${person.lastName}` : optionalText(formData, "manualPersonName"),
      description: parsed.description,
      category: parsed.category,
      subcategory: optionalText(formData, "subcategory"),
      priority: parsed.priority,
      status: parsed.status,
      referredArea: optionalText(formData, "referredArea"),
      notes: optionalText(formData, "notes"),
      confidentialSummary: optionalText(formData, "confidentialSummary"),
      lastStatusAt: attendedAt,
    },
  });

  await saveAttachments({
    files: formData.getAll("attachments"),
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: record.id,
    uploadedById: user.id,
  });
  await writeAuditLog({
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: record.id,
    action: "CREATE",
    createdById: user.id,
    after: record,
  });

  redirect(`/despacho/${record.id}`);
}

export async function updateDispatchRecord(recordId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const before = await prisma.dispatchRecord.findUniqueOrThrow({ where: { id: recordId } });

  const parsed = dispatchSchema.parse({
    description: text(formData, "description"),
    category: text(formData, "category"),
    priority: text(formData, "priority") || "MEDIA",
    status: text(formData, "status") || "RECIBIDO",
  });

  const person = await upsertPersonFromForm(formData);
  const attendedAt = optionalDate(formData, "attendedAt") ?? before.attendedAt;
  const after = await prisma.dispatchRecord.update({
    where: { id: recordId },
    data: {
      attendedAt,
      personId: person?.id ?? null,
      manualPersonName: person ? null : optionalText(formData, "manualPersonName"),
      dniSnapshot: person?.dni ?? optionalText(formData, "dni"),
      nameSnapshot: person ? `${person.firstName} ${person.lastName}` : optionalText(formData, "manualPersonName"),
      description: parsed.description,
      category: parsed.category,
      subcategory: optionalText(formData, "subcategory"),
      priority: parsed.priority,
      status: parsed.status,
      referredArea: optionalText(formData, "referredArea"),
      notes: optionalText(formData, "notes"),
      confidentialSummary: optionalText(formData, "confidentialSummary"),
      lastStatusAt: before.status !== parsed.status ? new Date() : before.lastStatusAt,
    },
  });

  await writeAuditLog({
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: recordId,
    action: before.status !== parsed.status ? "STATUS_CHANGE" : "UPDATE",
    createdById: user.id,
    before,
    after,
  });
  if (before.status !== parsed.status) {
    await syncDispatchReferralSummary(recordId, parsed.status);
  }
  revalidatePath(`/despacho/${recordId}`);
  redirect(`/despacho/${recordId}`);
}

export async function addDispatchFollowUp(recordId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const content = text(formData, "content");
  if (content.length < 3) return;
  const statusAfter = optionalText(formData, "statusAfter");
  const before = await prisma.dispatchRecord.findUniqueOrThrow({ where: { id: recordId } });

  const followUp = await prisma.dispatchFollowUp.create({
    data: {
      dispatchRecordId: recordId,
      content,
      statusAfter,
      createdById: user.id,
    },
  });

  let after = before;
  if (statusAfter && DISPATCH_STATUSES.includes(statusAfter)) {
    after = await prisma.dispatchRecord.update({
      where: { id: recordId },
      data: { status: statusAfter, lastStatusAt: new Date() },
    });
    await syncDispatchReferralSummary(recordId, statusAfter);
  }

  await writeAuditLog({
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: recordId,
    action: statusAfter ? "STATUS_CHANGE" : "FOLLOW_UP",
    createdById: user.id,
    before,
    after: { record: after, followUp },
  });
  revalidatePath(`/despacho/${recordId}`);
}

export async function referDispatchToArea(recordId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const area = text(formData, "area");
  const summary = text(formData, "summary");
  if (!area || !summary) return;

  const before = await prisma.dispatchRecord.findUniqueOrThrow({ where: { id: recordId } });
  const after = await prisma.dispatchRecord.update({
    where: { id: recordId },
    data: {
      referredArea: area,
      status: "DERIVADO",
      lastStatusAt: new Date(),
    },
  });
  const followUp = await prisma.dispatchFollowUp.create({
    data: {
      dispatchRecordId: recordId,
      content: `Derivado a ${area}. ${summary}`,
      statusAfter: "DERIVADO",
      createdById: user.id,
    },
  });
  await writeAuditLog({
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: recordId,
    action: "REFERRAL",
    createdById: user.id,
    before,
    after: { record: after, followUp },
  });
  revalidatePath(`/despacho/${recordId}`);
}

export async function deriveDispatchToJuridical(recordId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const summary = text(formData, "summary");
  const type = text(formData, "type") || "PRIMERA_INTERVENCION";
  if (summary.length < 8) return;

  const source = await prisma.dispatchRecord.findUniqueOrThrow({
    where: { id: recordId },
    include: { person: true },
  });

  const intervention = await prisma.juridicalIntervention.create({
    data: {
      internalNumber: await nextInternalNumber("JI", "juridical"),
      createdById: user.id,
      personId: source.personId,
      manualPersonName: source.manualPersonName,
      dniSnapshot: source.dniSnapshot,
      nameSnapshot: source.nameSnapshot,
      type,
      urgency: source.priority,
      status: "RECIBIDO",
      interventionContext: "ORIENTACION",
      counterpartType: "NO_APLICA",
      description: summary,
      guidanceProvided: "Derivacion recibida desde Despacho para primera evaluacion.",
      origin: "FROM_DESPACHO",
      attendedAt: new Date(),
      lastStatusAt: new Date(),
    },
  });

  const referral = await prisma.referral.create({
    data: {
      originModule: "DESPACHO",
      destinationModule: "JURIDICO",
      originDispatchRecordId: source.id,
      destinationJuridicalInterventionId: intervention.id,
      summary,
      status: "PENDIENTE",
      visibleStatusForOrigin: "Derivada a Intervenciones - pendiente de recepcion",
      referredById: user.id,
    },
  });

  const after = await prisma.dispatchRecord.update({
    where: { id: recordId },
    data: {
      status: "DERIVADO",
      referredArea: "Intervenciones Juridico-Institucionales",
      lastStatusAt: new Date(),
    },
  });

  await prisma.dispatchFollowUp.create({
    data: {
      dispatchRecordId: recordId,
      content: `Derivacion a Intervenciones: ${summary}`,
      statusAfter: "DERIVADO",
      createdById: user.id,
    },
  });

  await writeAuditLog({
    module: "DESPACHO",
    entityType: "Referral",
    entityId: referral.id,
    action: "REFERRAL",
    createdById: user.id,
    before: source,
    after: { dispatchRecord: after, intervention, referral },
  });
  revalidatePath(`/despacho/${recordId}`);
}

export async function uploadDispatchAttachment(recordId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const saved = await saveAttachments({
    files: formData.getAll("attachments"),
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: recordId,
    uploadedById: user.id,
  });
  if (saved.length) {
    await writeAuditLog({
      module: "DESPACHO",
      entityType: "DispatchRecord",
      entityId: recordId,
      action: "ATTACHMENT",
      createdById: user.id,
      after: saved,
    });
  }
  revalidatePath(`/despacho/${recordId}`);
}

export async function createExpedient(formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const parsed = expedientSchema.parse({
    expedienteNumber: optionalText(formData, "expedienteNumber"),
    category: text(formData, "category"),
    description: text(formData, "description"),
    status: text(formData, "status") || "INICIADO",
  });

  const expedient = await prisma.internalExpedient.create({
    data: {
      internalNumber: await nextInternalNumber("ADM", "expedient"),
      expedienteNumber: parsed.expedienteNumber,
      category: parsed.category,
      description: parsed.description,
      status: parsed.status,
      createdById: user.id,
    },
  });

  await saveAttachments({
    files: formData.getAll("attachments"),
    module: "DESPACHO",
    entityType: "InternalExpedient",
    entityId: expedient.id,
    uploadedById: user.id,
  });
  await writeAuditLog({
    module: "DESPACHO",
    entityType: "InternalExpedient",
    entityId: expedient.id,
    action: "CREATE",
    createdById: user.id,
    after: expedient,
  });
  redirect(`/despacho/expedientes/${expedient.id}`);
}

export async function updateExpedient(expedientId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const before = await prisma.internalExpedient.findUniqueOrThrow({ where: { id: expedientId } });
  const parsed = expedientSchema.parse({
    expedienteNumber: optionalText(formData, "expedienteNumber"),
    category: text(formData, "category"),
    description: text(formData, "description"),
    status: text(formData, "status") || "INICIADO",
  });

  const after = await prisma.internalExpedient.update({
    where: { id: expedientId },
    data: parsed,
  });
  await writeAuditLog({
    module: "DESPACHO",
    entityType: "InternalExpedient",
    entityId: expedientId,
    action: before.status !== after.status ? "STATUS_CHANGE" : "UPDATE",
    createdById: user.id,
    before,
    after,
  });
  revalidatePath(`/despacho/expedientes/${expedientId}`);
  redirect(`/despacho/expedientes/${expedientId}`);
}

export async function uploadExpedientAttachment(expedientId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const saved = await saveAttachments({
    files: formData.getAll("attachments"),
    module: "DESPACHO",
    entityType: "InternalExpedient",
    entityId: expedientId,
    uploadedById: user.id,
  });
  if (saved.length) {
    await writeAuditLog({
      module: "DESPACHO",
      entityType: "InternalExpedient",
      entityId: expedientId,
      action: "ATTACHMENT",
      createdById: user.id,
      after: saved,
    });
  }
  revalidatePath(`/despacho/expedientes/${expedientId}`);
}
