"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DISPATCH_STATUSES, EXPEDIENT_AREAS, EXPEDIENT_STATUSES, PRIORITIES } from "@/lib/constants";
import { CODIGOS_EXPEDIENTES_SET } from "@/lib/constants/codigosExpedientes";
import { checkbox, optionalDate, optionalText, text, nextInternalNumber } from "@/lib/form";
import { saveAttachments } from "@/lib/files";
import { prisma } from "@/lib/prisma";
import { canAccessDispatch, canAccessExpedients, assertAccess } from "@/lib/rbac";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const dispatchSchema = z.object({
  description: z.string().trim().min(1),
  category: z.string().min(1),
  priority: z.string().refine((value) => PRIORITIES.includes(value)),
  status: z.string().refine((value) => DISPATCH_STATUSES.includes(value)),
});

const expedientSchema = z.object({
  expedienteNumber: z.string().optional().nullable(),
  codigo: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || CODIGOS_EXPEDIENTES_SET.has(value), "Código de expediente inválido."),
  category: z.string().min(1),
  area: z.string().refine((value) => EXPEDIENT_AREAS.some((item) => item.value === value)),
  description: z.string().min(1),
  observation: z.string().optional().nullable(),
  status: z.string().refine((value) => EXPEDIENT_STATUSES.includes(value)),
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

function hasLinkedPersonData(person: LinkedPersonPayload) {
  return Boolean(person.dni || person.firstName || person.apellidoApodoManual || person.phone1 || person.phone2 || person.address);
}

function hasComplainantData(person: ComplainantPayload) {
  return Boolean(person.isAnonymous || person.dni || person.firstName || person.lastName || person.phone1 || person.phone2 || person.address);
}

function parseJsonArray(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function parseComplainants(formData: FormData) {
  return z.array(complainantPayloadSchema).parse(parseJsonArray(formData, "complainantsPayload")).map((person) =>
    person.isAnonymous
      ? {
          isAnonymous: true,
          dni: "",
          firstName: "",
          lastName: "",
          phone1: "",
          phone2: "",
          address: "",
        }
      : person,
  ).filter(hasComplainantData);
}

function parseLinkedPersons(formData: FormData) {
  return z.array(linkedPersonPayloadSchema).parse(parseJsonArray(formData, "linkedPersonsPayload")).filter(hasLinkedPersonData);
}

function nullable(value: string) {
  return value.trim() || null;
}

function linkedPersonName(person: { firstName: string | null; apellidoApodoManual: string | null } | undefined) {
  if (!person) return null;
  return [person.firstName, person.apellidoApodoManual].filter(Boolean).join(" ").trim() || null;
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

  const complainants = parseComplainants(formData);
  const linkedPersons = parseLinkedPersons(formData);
  const firstLinkedPerson = linkedPersons[0];
  const usesHistoricalDate = checkbox(formData, "usesHistoricalDate");
  const attendedAt = usesHistoricalDate ? optionalDate(formData, "attendedAt") : new Date();
  if (!attendedAt || Number.isNaN(attendedAt.getTime())) {
    throw new Error("La fecha y hora de atención no es válida.");
  }

  const record = await prisma.dispatchRecord.create({
    data: {
      internalNumber: await nextInternalNumber("DES", "dispatch"),
      attendedAt,
      usesHistoricalDate,
      createdById: user.id,
      personId: null,
      dniSnapshot: firstLinkedPerson?.dni || null,
      nameSnapshot: linkedPersonName(firstLinkedPerson),
      description: parsed.description,
      initialGuidance: optionalText(formData, "initialGuidance"),
      confidentialNotes: optionalText(formData, "confidentialNotes"),
      category: parsed.category,
      priority: parsed.priority,
      status: parsed.status,
      referredArea: optionalText(formData, "referredArea"),
      lastStatusAt: attendedAt,
      complainants: {
        create: complainants.map(complainantCreateData),
      },
      linkedPersons: {
        create: linkedPersons.map(linkedPersonCreateData),
      },
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

  const complainants = parseComplainants(formData);
  const linkedPersons = parseLinkedPersons(formData);
  const firstLinkedPerson = linkedPersons[0];
  const usesHistoricalDate = checkbox(formData, "usesHistoricalDate");
  const historicalDate = optionalDate(formData, "attendedAt");
  const attendedAt = usesHistoricalDate ? historicalDate : before.attendedAt;
  if (!attendedAt || Number.isNaN(attendedAt.getTime())) {
    throw new Error("La fecha y hora de atención no es válida.");
  }

  const after = await prisma.dispatchRecord.update({
    where: { id: recordId },
    data: {
      attendedAt,
      usesHistoricalDate,
      personId: null,
      dniSnapshot: firstLinkedPerson?.dni || null,
      nameSnapshot: linkedPersonName(firstLinkedPerson),
      description: parsed.description,
      initialGuidance: optionalText(formData, "initialGuidance"),
      confidentialNotes: optionalText(formData, "confidentialNotes"),
      category: parsed.category,
      priority: parsed.priority,
      status: parsed.status,
      referredArea: optionalText(formData, "referredArea"),
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
  redirect(`/despacho/${recordId}`);
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
  redirect(`/despacho/${recordId}`);
}

export async function deriveDispatchToJuridical(recordId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const summary = text(formData, "summary");
  const type = text(formData, "type") || "PRIMERA_INTERVENCION";
  if (summary.length < 8) return;

  const source = await prisma.dispatchRecord.findUniqueOrThrow({
    where: { id: recordId },
    include: {
      person: true,
      complainants: { orderBy: { sortOrder: "asc" } },
      linkedPersons: { orderBy: { sortOrder: "asc" } },
    },
  });
  const complainant = source.complainants[0];
  const firstLinkedPerson = source.linkedPersons[0];

  const intervention = await prisma.juridicalIntervention.create({
    data: {
      internalNumber: await nextInternalNumber("JI", "juridical"),
      createdById: user.id,
      personId: null,
      dniSnapshot: firstLinkedPerson?.dni ?? source.dniSnapshot,
      nameSnapshot: linkedPersonName(firstLinkedPerson) ?? source.nameSnapshot,
      complainantIsAnonymous: Boolean(complainant?.isAnonymous),
      complainantDni: complainant?.isAnonymous ? null : complainant?.dni,
      complainantFirstName: complainant?.isAnonymous ? null : complainant?.firstName,
      complainantLastName: complainant?.isAnonymous ? null : complainant?.lastName,
      complainantPhone1: complainant?.isAnonymous ? null : complainant?.phone1,
      complainantPhone2: complainant?.isAnonymous ? null : complainant?.phone2,
      complainantAddress: complainant?.isAnonymous ? null : complainant?.address,
      type,
      urgency: source.priority,
      status: "RECIBIDO",
      interventionContext: "ORIENTACION",
      counterpartType: null,
      description: summary,
      guidanceProvided: "Derivacion recibida desde Despacho para primera evaluacion.",
      origin: "FROM_DESPACHO",
      attendedAt: new Date(),
      lastStatusAt: new Date(),
      complainants: {
        create: source.complainants.map((person, index) => ({
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
        create: source.linkedPersons.map((person, index) => ({
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
  redirect(`/despacho/${recordId}`);
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
  redirect(`/despacho/${recordId}`);
}

export async function createExpedient(formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const parsed = expedientSchema.parse({
    expedienteNumber: optionalText(formData, "expedienteNumber"),
    codigo: optionalText(formData, "codigo"),
    category: text(formData, "category"),
    area: text(formData, "area"),
    description: text(formData, "description"),
    observation: optionalText(formData, "observation"),
    status: text(formData, "status") || "INICIADO",
  });

  const expedient = await prisma.internalExpedient.create({
    data: {
      internalNumber: await nextInternalNumber("ADM", "expedient"),
      expedienteNumber: parsed.expedienteNumber,
      codigo: parsed.codigo,
      category: parsed.category,
      area: parsed.area,
      description: parsed.description,
      observation: parsed.observation,
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
    codigo: optionalText(formData, "codigo"),
    category: text(formData, "category"),
    area: text(formData, "area"),
    description: text(formData, "description"),
    observation: optionalText(formData, "observation"),
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
  redirect(`/despacho/expedientes/${expedientId}`);
}
