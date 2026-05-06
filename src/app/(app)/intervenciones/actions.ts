"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACTION_TYPES, JURIDICAL_STATUSES, PRIORITIES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { saveAttachments } from "@/lib/files";
import { complainantFromForm, nextInternalNumber, optionalDate, optionalText, text, upsertPersonFromForm } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";

const interventionSchema = z.object({
  description: z.string().min(8),
  type: z.string().min(1),
  urgency: z.string().refine((value) => PRIORITIES.includes(value)),
  status: z.string().refine((value) => JURIDICAL_STATUSES.includes(value)),
});

async function syncJuridicalReferralSummary(interventionId: string, status: string) {
  await prisma.referral.updateMany({
    where: { destinationJuridicalInterventionId: interventionId },
    data: {
      visibleStatusForOrigin: `Intervenciones: ${status}`,
      status: ["CONCLUIDO", "ARCHIVADO"].includes(status) ? "CERRADA" : "EN_GESTION",
      closedAt: ["CONCLUIDO", "ARCHIVADO"].includes(status) ? new Date() : null,
    },
  });
}

export async function createJuridicalIntervention(formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const parsed = interventionSchema.parse({
    description: text(formData, "description"),
    type: text(formData, "type"),
    urgency: text(formData, "urgency") || "MEDIA",
    status: text(formData, "status") || "RECIBIDO",
  });
  const person = await upsertPersonFromForm(formData);
  const attendedAt = optionalDate(formData, "attendedAt") ?? new Date();
  const complainant = complainantFromForm(formData);

  const intervention = await prisma.juridicalIntervention.create({
    data: {
      internalNumber: await nextInternalNumber("JI", "juridical"),
      attendedAt,
      createdById: user.id,
      personId: person?.id,
      dniSnapshot: person?.dni ?? optionalText(formData, "dni"),
      nameSnapshot: person ? `${person.firstName} ${person.lastName}` : null,
      ...complainant,
      type: parsed.type,
      subType: optionalText(formData, "subType"),
      urgency: parsed.urgency,
      status: parsed.status,
      oficioNumber: optionalText(formData, "oficioNumber"),
      expedienteNumber: optionalText(formData, "expedienteNumber"),
      interventionContext: optionalText(formData, "interventionContext"),
      counterpartType: optionalText(formData, "counterpartType"),
      description: parsed.description,
      guidanceProvided: optionalText(formData, "guidanceProvided"),
      referredToAgency: optionalText(formData, "referredToAgency"),
      lastStatusAt: attendedAt,
    },
  });

  await saveAttachments({
    files: formData.getAll("attachments"),
    module: "JURIDICO",
    entityType: "JuridicalIntervention",
    entityId: intervention.id,
    uploadedById: user.id,
    isPrivate: true,
  });
  await writeAuditLog({
    module: "JURIDICO",
    entityType: "JuridicalIntervention",
    entityId: intervention.id,
    action: "CREATE",
    createdById: user.id,
    after: intervention,
  });
  redirect(`/intervenciones/${intervention.id}`);
}

export async function updateJuridicalIntervention(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const before = await prisma.juridicalIntervention.findUniqueOrThrow({ where: { id: interventionId } });
  const parsed = interventionSchema.parse({
    description: text(formData, "description"),
    type: text(formData, "type"),
    urgency: text(formData, "urgency") || "MEDIA",
    status: text(formData, "status") || "RECIBIDO",
  });
  const person = await upsertPersonFromForm(formData);
  const attendedAt = optionalDate(formData, "attendedAt") ?? before.attendedAt;
  const complainant = complainantFromForm(formData);

  const after = await prisma.juridicalIntervention.update({
    where: { id: interventionId },
    data: {
      attendedAt,
      personId: person?.id ?? null,
      dniSnapshot: person?.dni ?? optionalText(formData, "dni"),
      nameSnapshot: person ? `${person.firstName} ${person.lastName}` : null,
      ...complainant,
      type: parsed.type,
      subType: optionalText(formData, "subType"),
      urgency: parsed.urgency,
      status: parsed.status,
      oficioNumber: optionalText(formData, "oficioNumber"),
      expedienteNumber: optionalText(formData, "expedienteNumber"),
      interventionContext: optionalText(formData, "interventionContext"),
      counterpartType: optionalText(formData, "counterpartType"),
      description: parsed.description,
      guidanceProvided: optionalText(formData, "guidanceProvided"),
      referredToAgency: optionalText(formData, "referredToAgency"),
      lastStatusAt: before.status !== parsed.status ? new Date() : before.lastStatusAt,
    },
  });
  await writeAuditLog({
    module: "JURIDICO",
    entityType: "JuridicalIntervention",
    entityId: interventionId,
    action: before.status !== after.status ? "STATUS_CHANGE" : "UPDATE",
    createdById: user.id,
    before,
    after,
  });
  if (before.status !== after.status) {
    await syncJuridicalReferralSummary(interventionId, after.status);
  }
  revalidatePath(`/intervenciones/${interventionId}`);
  redirect(`/intervenciones/${interventionId}`);
}

export async function addJuridicalAction(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const actionType = text(formData, "actionType") || "SEGUIMIENTO";
  const content = text(formData, "content");
  const statusAfter = optionalText(formData, "statusAfter");
  if (!ACTION_TYPES.includes(actionType) || content.length < 3) return;

  const before = await prisma.juridicalIntervention.findUniqueOrThrow({ where: { id: interventionId } });
  const action = await prisma.juridicalAction.create({
    data: {
      juridicalInterventionId: interventionId,
      actionType,
      content,
      nextStepDate: optionalDate(formData, "nextStepDate"),
      createdById: user.id,
    },
  });

  let after = before;
  if (statusAfter && JURIDICAL_STATUSES.includes(statusAfter)) {
    after = await prisma.juridicalIntervention.update({
      where: { id: interventionId },
      data: { status: statusAfter, lastStatusAt: new Date() },
    });
    await syncJuridicalReferralSummary(interventionId, statusAfter);
  }

  await writeAuditLog({
    module: "JURIDICO",
    entityType: "JuridicalIntervention",
    entityId: interventionId,
    action: statusAfter ? "STATUS_CHANGE" : "ACTION",
    createdById: user.id,
    before,
    after: { intervention: after, action },
  });
  revalidatePath(`/intervenciones/${interventionId}`);
  redirect(`/intervenciones/${interventionId}`);
}

export async function deriveJuridicalToDispatch(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const summary = text(formData, "summary");
  if (summary.length < 8) return;

  const source = await prisma.juridicalIntervention.findUniqueOrThrow({
    where: { id: interventionId },
    include: { person: true },
  });
  const hasComplainant =
    source.complainantIsAnonymous ||
    Boolean(
      source.complainantDni ||
        source.complainantFirstName ||
        source.complainantLastName ||
        source.complainantPhone1 ||
        source.complainantPhone2 ||
        source.complainantAddress,
    );
  const linkedName = source.nameSnapshot;
  const hasLinkedPerson = Boolean(source.person || source.dniSnapshot || linkedName);

  const dispatchRecord = await prisma.dispatchRecord.create({
    data: {
      internalNumber: await nextInternalNumber("DES", "dispatch"),
      createdById: user.id,
      personId: source.personId,
      dniSnapshot: source.dniSnapshot,
      nameSnapshot: source.nameSnapshot,
      description: summary,
      category: "PEDIDO",
      priority: source.urgency,
      status: "RECIBIDO",
      referredArea: optionalText(formData, "area") ?? "Despacho",
      origin: "FROM_JURIDICO",
      attendedAt: new Date(),
      lastStatusAt: new Date(),
      complainants: hasComplainant
        ? {
            create: [
              {
                sortOrder: 0,
                isAnonymous: source.complainantIsAnonymous,
                dni: source.complainantIsAnonymous ? null : source.complainantDni,
                firstName: source.complainantIsAnonymous ? null : source.complainantFirstName,
                lastName: source.complainantIsAnonymous ? null : source.complainantLastName,
                phone1: source.complainantIsAnonymous ? null : source.complainantPhone1,
                phone2: source.complainantIsAnonymous ? null : source.complainantPhone2,
                address: source.complainantIsAnonymous ? null : source.complainantAddress,
              },
            ],
          }
        : undefined,
      linkedPersons: hasLinkedPerson
        ? {
            create: [
              {
                sortOrder: 0,
                dni: source.person?.dni ?? source.dniSnapshot,
                firstName: source.person?.firstName,
                apellidoApodoManual: source.person?.lastName ?? linkedName,
                phone1: source.person?.phone1,
                phone2: source.person?.phone2,
                address: source.person?.address,
              },
            ],
          }
        : undefined,
    },
  });

  const referral = await prisma.referral.create({
    data: {
      originModule: "JURIDICO",
      destinationModule: "DESPACHO",
      originJuridicalInterventionId: source.id,
      destinationDispatchRecordId: dispatchRecord.id,
      summary,
      status: "PENDIENTE",
      visibleStatusForOrigin: "Pendiente de gestion en Despacho",
      referredById: user.id,
    },
  });

  await prisma.juridicalAction.create({
    data: {
      juridicalInterventionId: interventionId,
      actionType: "DERIVACION",
      content: `Derivacion a Despacho: ${summary}`,
      createdById: user.id,
    },
  });

  await writeAuditLog({
    module: "JURIDICO",
    entityType: "Referral",
    entityId: referral.id,
    action: "REFERRAL",
    createdById: user.id,
    before: source,
    after: { dispatchRecord, referral },
  });
  revalidatePath(`/intervenciones/${interventionId}`);
  redirect(`/intervenciones/${interventionId}`);
}

export async function uploadJuridicalAttachment(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const saved = await saveAttachments({
    files: formData.getAll("attachments"),
    module: "JURIDICO",
    entityType: "JuridicalIntervention",
    entityId: interventionId,
    uploadedById: user.id,
    isPrivate: true,
  });
  if (saved.length) {
    await writeAuditLog({
      module: "JURIDICO",
      entityType: "JuridicalIntervention",
      entityId: interventionId,
      action: "ATTACHMENT",
      createdById: user.id,
      after: saved,
    });
  }
  revalidatePath(`/intervenciones/${interventionId}`);
  redirect(`/intervenciones/${interventionId}`);
}
