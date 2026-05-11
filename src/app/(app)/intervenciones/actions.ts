"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACTION_TYPES, JURIDICAL_STATUSES, PRIORITIES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { saveAttachments } from "@/lib/files";
import { nextInternalNumber, optionalDate, optionalText, text } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";

const interventionSchema = z.object({
  description: z.string().trim().min(1),
  type: z.string().min(1),
  urgency: z.string().refine((value) => PRIORITIES.includes(value)),
  status: z.string().refine((value) => JURIDICAL_STATUSES.includes(value)),
});

const dniPattern = /^\d{7,8}$/;
const phonePattern = /^\d{7,10}$/;
const namePattern = /^[\p{L} ]+$/u;
const addressPattern = /^[\p{L}\d .,\-/]+$/u;

const optionalDniSchema = z
  .string()
  .trim()
  .refine((value) => !value || dniPattern.test(value), "El DNI debe tener entre 7 y 8 numeros.");

const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => !value || phonePattern.test(value), "El telefono debe tener entre 7 y 10 numeros.");

const optionalNameSchema = z
  .string()
  .trim()
  .refine((value) => !value || namePattern.test(value), "El nombre y apellido solo pueden tener letras y espacios.");

const optionalAddressSchema = z
  .string()
  .trim()
  .refine((value) => !value || addressPattern.test(value), "El domicilio contiene caracteres no permitidos.");

const complainantPayloadSchema = z.object({
  isAnonymous: z.boolean().default(false),
  dni: optionalDniSchema.default(""),
  firstName: optionalNameSchema.default(""),
  lastName: optionalNameSchema.default(""),
  phone1: optionalPhoneSchema.default(""),
  phone2: optionalPhoneSchema.default(""),
  address: optionalAddressSchema.default(""),
});

const linkedPersonPayloadSchema = z.object({
  dni: optionalDniSchema.default(""),
  firstName: optionalNameSchema.default(""),
  apellidoApodoManual: optionalNameSchema.default(""),
  phone1: optionalPhoneSchema.default(""),
  phone2: optionalPhoneSchema.default(""),
  address: optionalAddressSchema.default(""),
});

type ComplainantPayload = z.infer<typeof complainantPayloadSchema>;
type LinkedPersonPayload = z.infer<typeof linkedPersonPayloadSchema>;

function parseJsonArray(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function hasComplainantData(person: ComplainantPayload) {
  return Boolean(person.isAnonymous || person.dni || person.firstName || person.lastName || person.phone1 || person.phone2 || person.address);
}

function hasLinkedPersonData(person: LinkedPersonPayload) {
  return Boolean(person.dni || person.firstName || person.apellidoApodoManual || person.phone1 || person.phone2 || person.address);
}

function parseComplainants(formData: FormData) {
  return z.array(complainantPayloadSchema).parse(parseJsonArray(formData, "complainantsPayload")).map((person) =>
    person.isAnonymous
      ? { isAnonymous: true, dni: "", firstName: "", lastName: "", phone1: "", phone2: "", address: "" }
      : person,
  ).filter(hasComplainantData);
}

function parseLinkedPersons(formData: FormData) {
  return z.array(linkedPersonPayloadSchema).parse(parseJsonArray(formData, "linkedPersonsPayload")).filter(hasLinkedPersonData);
}

function nullable(value: string | null | undefined) {
  return value?.trim() || null;
}

function complainantCreateData(person: ComplainantPayload, index: number) {
  return {
    sortOrder: index,
    isAnonymous: person.isAnonymous,
    dni: person.isAnonymous ? null : nullable(person.dni),
    firstName: person.isAnonymous ? null : nullable(person.firstName),
    lastName: person.isAnonymous ? null : nullable(person.lastName),
    phone1: person.isAnonymous ? null : nullable(person.phone1),
    phone2: person.isAnonymous ? null : nullable(person.phone2),
    address: person.isAnonymous ? null : nullable(person.address),
  };
}

function linkedPersonCreateData(person: LinkedPersonPayload, index: number) {
  return {
    sortOrder: index,
    dni: nullable(person.dni),
    firstName: nullable(person.firstName),
    apellidoApodoManual: nullable(person.apellidoApodoManual),
    phone1: nullable(person.phone1),
    phone2: nullable(person.phone2),
    address: nullable(person.address),
  };
}

function linkedPersonName(person: LinkedPersonPayload | undefined) {
  if (!person) return null;
  return [person.firstName, person.apellidoApodoManual].filter(Boolean).join(" ").trim() || null;
}

const juridicalAuditInclude = {
  complainants: { orderBy: { sortOrder: "asc" as const } },
  linkedPersons: { orderBy: { sortOrder: "asc" as const } },
};

async function juridicalAuditSnapshot(interventionId: string) {
  return prisma.juridicalIntervention.findUniqueOrThrow({
    where: { id: interventionId },
    include: juridicalAuditInclude,
  });
}

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
  const complainants = parseComplainants(formData);
  const linkedPersons = parseLinkedPersons(formData);
  const firstComplainant = complainants[0];
  const firstLinkedPerson = linkedPersons[0];
  const attendedAt = optionalDate(formData, "attendedAt") ?? new Date();
  if (Number.isNaN(attendedAt.getTime())) {
    throw new Error("La fecha y hora de atencion no es valida.");
  }

  const intervention = await prisma.juridicalIntervention.create({
    data: {
      internalNumber: await nextInternalNumber("JI", "juridical"),
      attendedAt,
      createdById: user.id,
      personId: null,
      dniSnapshot: firstLinkedPerson?.dni || null,
      nameSnapshot: linkedPersonName(firstLinkedPerson),
      complainantIsAnonymous: Boolean(firstComplainant?.isAnonymous),
      complainantDni: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.dni),
      complainantFirstName: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.firstName),
      complainantLastName: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.lastName),
      complainantPhone1: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.phone1),
      complainantPhone2: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.phone2),
      complainantAddress: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.address),
      type: parsed.type,
      subType: null,
      urgency: parsed.urgency,
      status: parsed.status,
      oficioNumber: optionalText(formData, "oficioNumber"),
      expedienteNumber: optionalText(formData, "expedienteNumber"),
      interventionContext: optionalText(formData, "interventionContext"),
      counterpartType: null,
      description: parsed.description,
      guidanceProvided: optionalText(formData, "guidanceProvided"),
      referredToAgency: optionalText(formData, "referredToAgency"),
      derivedArea: optionalText(formData, "derivedArea"),
      confidentialNotes: optionalText(formData, "confidentialNotes"),
      lastStatusAt: attendedAt,
      complainants: {
        create: complainants.map(complainantCreateData),
      },
      linkedPersons: {
        create: linkedPersons.map(linkedPersonCreateData),
      },
    },
    include: juridicalAuditInclude,
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
  const before = await juridicalAuditSnapshot(interventionId);
  const parsed = interventionSchema.parse({
    description: text(formData, "description"),
    type: text(formData, "type"),
    urgency: text(formData, "urgency") || "MEDIA",
    status: text(formData, "status") || "RECIBIDO",
  });
  const complainants = parseComplainants(formData);
  const linkedPersons = parseLinkedPersons(formData);
  const firstComplainant = complainants[0];
  const firstLinkedPerson = linkedPersons[0];
  const attendedAt = optionalDate(formData, "attendedAt") ?? before.attendedAt;
  if (Number.isNaN(attendedAt.getTime())) {
    throw new Error("La fecha y hora de atencion no es valida.");
  }

  const after = await prisma.juridicalIntervention.update({
    where: { id: interventionId },
    data: {
      attendedAt,
      personId: null,
      dniSnapshot: firstLinkedPerson?.dni || null,
      nameSnapshot: linkedPersonName(firstLinkedPerson),
      complainantIsAnonymous: Boolean(firstComplainant?.isAnonymous),
      complainantDni: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.dni),
      complainantFirstName: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.firstName),
      complainantLastName: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.lastName),
      complainantPhone1: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.phone1),
      complainantPhone2: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.phone2),
      complainantAddress: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.address),
      type: parsed.type,
      subType: null,
      urgency: parsed.urgency,
      status: parsed.status,
      oficioNumber: optionalText(formData, "oficioNumber"),
      expedienteNumber: optionalText(formData, "expedienteNumber"),
      interventionContext: optionalText(formData, "interventionContext"),
      counterpartType: null,
      description: parsed.description,
      guidanceProvided: optionalText(formData, "guidanceProvided"),
      referredToAgency: optionalText(formData, "referredToAgency"),
      derivedArea: optionalText(formData, "derivedArea"),
      confidentialNotes: optionalText(formData, "confidentialNotes"),
      lastStatusAt: before.status !== parsed.status ? new Date() : before.lastStatusAt,
      complainants: {
        deleteMany: {},
        create: complainants.map(complainantCreateData),
      },
      linkedPersons: {
        deleteMany: {},
        create: linkedPersons.map(linkedPersonCreateData),
      },
    },
    include: juridicalAuditInclude,
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

  const before = await juridicalAuditSnapshot(interventionId);
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
      include: juridicalAuditInclude,
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
    include: {
      person: true,
      complainants: { orderBy: { sortOrder: "asc" } },
      linkedPersons: { orderBy: { sortOrder: "asc" } },
    },
  });
  const complainants = source.complainants.length
    ? source.complainants
    : source.complainantIsAnonymous ||
        source.complainantDni ||
        source.complainantFirstName ||
        source.complainantLastName ||
        source.complainantPhone1 ||
        source.complainantPhone2 ||
        source.complainantAddress
      ? [
          {
            isAnonymous: source.complainantIsAnonymous,
            dni: source.complainantDni,
            firstName: source.complainantFirstName,
            lastName: source.complainantLastName,
            phone1: source.complainantPhone1,
            phone2: source.complainantPhone2,
            address: source.complainantAddress,
          },
        ]
      : [];
  const linkedPersons = source.linkedPersons.length
    ? source.linkedPersons
    : source.person || source.dniSnapshot || source.nameSnapshot
      ? [
          {
            dni: source.person?.dni ?? source.dniSnapshot,
            firstName: source.person?.firstName ?? null,
            apellidoApodoManual: source.person?.lastName ?? source.nameSnapshot,
            phone1: source.person?.phone1 ?? null,
            phone2: source.person?.phone2 ?? null,
            address: source.person?.address ?? null,
          },
        ]
      : [];

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
      complainants: {
        create: complainants.map((person, index) => ({
          sortOrder: index,
          isAnonymous: person.isAnonymous,
          dni: person.isAnonymous ? null : person.dni,
          firstName: person.isAnonymous ? null : person.firstName,
          lastName: person.isAnonymous ? null : person.lastName,
          phone1: person.isAnonymous ? null : person.phone1,
          phone2: person.isAnonymous ? null : person.phone2,
          address: person.isAnonymous ? null : person.address,
        })),
      },
      linkedPersons: {
        create: linkedPersons.map((person, index) => ({
          sortOrder: index,
          dni: person.dni,
          firstName: person.firstName,
          apellidoApodoManual: person.apellidoApodoManual,
          phone1: person.phone1,
          phone2: person.phone2,
          address: person.address,
        })),
      },
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
