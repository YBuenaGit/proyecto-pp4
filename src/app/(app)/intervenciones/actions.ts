"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACTION_TYPES, JURIDICAL_STATUSES, PRIORITIES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { consumeAttachmentUploads } from "@/lib/direct-uploads";
import { checkbox, nextInternalNumber, optionalDate, optionalSentenceText, optionalText, sentenceText, text } from "@/lib/form";
import {
  hasIntakeComplainantData,
  hasIntakeLinkedPersonData,
  hasIntakePeopleResolution,
} from "@/lib/intake-validation";
import { buildJuridicalActionContent } from "@/lib/juridical-action-content";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical, canBypassLegajoRestriction } from "@/lib/rbac";
import { capitalizeOptionalText, personDisplayName } from "@/lib/text";

const interventionSchema = z.object({
  description: z.string().trim().min(1),
  type: z.string().min(1),
  urgency: z.string().refine((value) => PRIORITIES.includes(value)),
  status: z.string().refine((value) => JURIDICAL_STATUSES.includes(value)),
});

const interventionCreationSchema = interventionSchema.extend({
  guidanceProvided: z.string().trim().min(1),
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

function parseComplainants(formData: FormData) {
  return z.array(complainantPayloadSchema).parse(parseJsonArray(formData, "complainantsPayload")).map((person) =>
    person.isAnonymous
      ? { isAnonymous: true, dni: "", firstName: "", lastName: "", phone1: "", phone2: "", address: "" }
      : person,
  ).filter(hasIntakeComplainantData);
}

function parseLinkedPersons(formData: FormData) {
  return z.array(linkedPersonPayloadSchema).parse(parseJsonArray(formData, "linkedPersonsPayload")).filter(hasIntakeLinkedPersonData);
}

function nullable(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeReferralArea(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .toLocaleLowerCase("es-AR")
    .trim();
}

function referralSummaryFrom(source: { description: string; internalNumber: string }, area: string) {
  const description = source.description.trim();
  return description.length >= 8 ? description : `Derivacion a ${area} desde ${source.internalNumber}.`;
}

function redirectWithReferralSuccess(path: string) {
  redirect(`${path}?derivacion=ok`);
}

function isDispatchReferralArea(value: string | null | undefined) {
  return normalizeReferralArea(value) === "despacho";
}

function isDirectivoReferralArea(value: string | null | undefined) {
  return normalizeReferralArea(value) === "directivo";
}

function isJuridicalReferralArea(value: string | null | undefined) {
  const area = normalizeReferralArea(value);
  return Boolean(
    area &&
      (area.startsWith("intervenciones") ||
        area.includes("juridico") ||
        area.includes("contencion a la victima") ||
        area.includes("proteccion a la victima")),
  );
}

function complainantCreateData(person: ComplainantPayload, index: number) {
  return {
    sortOrder: index,
    isAnonymous: person.isAnonymous,
    dni: person.isAnonymous ? null : nullable(person.dni),
    firstName: person.isAnonymous ? null : capitalizeOptionalText(person.firstName),
    lastName: person.isAnonymous ? null : capitalizeOptionalText(person.lastName),
    phone1: person.isAnonymous ? null : nullable(person.phone1),
    phone2: person.isAnonymous ? null : nullable(person.phone2),
    address: person.isAnonymous ? null : capitalizeOptionalText(person.address),
  };
}

function linkedPersonCreateData(person: LinkedPersonPayload, index: number) {
  return {
    sortOrder: index,
    dni: nullable(person.dni),
    firstName: capitalizeOptionalText(person.firstName),
    apellidoApodoManual: capitalizeOptionalText(person.apellidoApodoManual),
    phone1: nullable(person.phone1),
    phone2: nullable(person.phone2),
    address: capitalizeOptionalText(person.address),
  };
}

function linkedPersonName(person: LinkedPersonPayload | undefined) {
  if (!person) return null;
  return personDisplayName(person.apellidoApodoManual, person.firstName) || null;
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

async function isJuridicalLegajoDerivedOut(interventionId: string) {
  const intervention = await prisma.juridicalIntervention.findUniqueOrThrow({
    where: { id: interventionId },
    select: {
      derivedArea: true,
      _count: { select: { originReferrals: true } },
    },
  });
  return Boolean(intervention.derivedArea || intervention._count.originReferrals);
}

async function createJuridicalDirectivoReferral(interventionId: string, summary: string, userId: string, destinationArea = "Directivo") {
  const before = await juridicalAuditSnapshot(interventionId);
  const referral = await prisma.referral.create({
    data: {
      originModule: "JURIDICO",
      destinationModule: "DIRECTIVO",
      originJuridicalInterventionId: interventionId,
      summary,
      status: "PENDIENTE",
      visibleStatusForOrigin: "Derivada a Directivo - pendiente de recepcion",
      referredById: userId,
    },
  });
  const after = await prisma.juridicalIntervention.update({
    where: { id: interventionId },
    data: { derivedArea: destinationArea },
    include: juridicalAuditInclude,
  });
  const action = await prisma.juridicalAction.create({
    data: {
      juridicalInterventionId: interventionId,
      actionType: "DERIVACION",
      content: `Derivacion a ${destinationArea}: ${summary}`,
      createdById: userId,
    },
  });

  await writeAuditLog({
    module: "JURIDICO",
    entityType: "Referral",
    entityId: referral.id,
    action: "REFERRAL",
    createdById: userId,
    before,
    after: { intervention: after, action, referral },
  });
}

async function createJuridicalSelfReferral(interventionId: string, summary: string, userId: string, destinationArea: string) {
  const before = await juridicalAuditSnapshot(interventionId);
  const referral = await prisma.referral.create({
    data: {
      originModule: "JURIDICO",
      destinationModule: "JURIDICO",
      originJuridicalInterventionId: interventionId,
      destinationJuridicalInterventionId: interventionId,
      summary,
      status: "PENDIENTE",
      visibleStatusForOrigin: `Derivada a ${destinationArea} - pendiente de recepcion`,
      referredById: userId,
    },
  });
  const after = await prisma.juridicalIntervention.update({
    where: { id: interventionId },
    data: { derivedArea: destinationArea },
    include: juridicalAuditInclude,
  });
  const action = await prisma.juridicalAction.create({
    data: {
      juridicalInterventionId: interventionId,
      actionType: "DERIVACION",
      content: `Derivacion a ${destinationArea}: ${summary}`,
      createdById: userId,
    },
  });

  await writeAuditLog({
    module: "JURIDICO",
    entityType: "Referral",
    entityId: referral.id,
    action: "REFERRAL",
    createdById: userId,
    before,
    after: { intervention: after, action, referral },
  });
}

async function createJuridicalExternalAreaReferral(interventionId: string, area: string, userId: string) {
  const before = await juridicalAuditSnapshot(interventionId);
  const after = await prisma.juridicalIntervention.update({
    where: { id: interventionId },
    data: { derivedArea: area },
    include: juridicalAuditInclude,
  });
  const action = await prisma.juridicalAction.create({
    data: {
      juridicalInterventionId: interventionId,
      actionType: "DERIVACION",
      content: `Derivacion a ${area}.`,
      createdById: userId,
    },
  });

  await writeAuditLog({
    module: "JURIDICO",
    entityType: "JuridicalIntervention",
    entityId: interventionId,
    action: "REFERRAL",
    createdById: userId,
    before,
    after: { intervention: after, action },
  });
}

async function applyJuridicalReferralFromArea(interventionId: string, area: string, summary: string, userId: string) {
  if (isDispatchReferralArea(area)) {
    const referralData = new FormData();
    referralData.set("summary", summary);
    referralData.set("area", area);
    await deriveJuridicalToDispatch(interventionId, referralData);
    return;
  }

  if (isDirectivoReferralArea(area)) {
    await createJuridicalDirectivoReferral(interventionId, summary, userId, area);
    return;
  }

  if (isJuridicalReferralArea(area)) {
    await createJuridicalSelfReferral(interventionId, summary, userId, area);
    return;
  }

  await createJuridicalExternalAreaReferral(interventionId, area, userId);
}

export async function createJuridicalIntervention(formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const parsed = interventionCreationSchema.parse({
    description: sentenceText(formData, "description"),
    guidanceProvided: sentenceText(formData, "guidanceProvided"),
    type: text(formData, "type"),
    urgency: text(formData, "urgency") || "MEDIA",
    status: text(formData, "status") || "RECIBIDO",
  });
  const complainants = parseComplainants(formData);
  const noLinkedPerson = checkbox(formData, "noLinkedPerson");
  const linkedPersons = noLinkedPerson ? [] : parseLinkedPersons(formData);
  if (
    !hasIntakePeopleResolution({
      complainants,
      linkedPersons,
      noLinkedPerson,
    })
  ) {
    throw new Error(
      "Debe cargar al menos un denunciante o marcarlo como anónimo y, además, cargar una persona vinculada o indicar que no existe.",
    );
  }
  const firstComplainant = complainants[0];
  const firstLinkedPerson = linkedPersons[0];
  const derivedArea = optionalText(formData, "derivedArea");
  const attendedAt = optionalDate(formData, "attendedAt") ?? new Date();
  const deadlineAt = optionalDate(formData, "deadlineAt");
  if (Number.isNaN(attendedAt.getTime())) {
    throw new Error("La fecha y hora de atencion no es valida.");
  }
  if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
    throw new Error("El plazo no es valido.");
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
      complainantFirstName: firstComplainant?.isAnonymous ? null : capitalizeOptionalText(firstComplainant?.firstName),
      complainantLastName: firstComplainant?.isAnonymous ? null : capitalizeOptionalText(firstComplainant?.lastName),
      complainantPhone1: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.phone1),
      complainantPhone2: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.phone2),
      complainantAddress: firstComplainant?.isAnonymous ? null : capitalizeOptionalText(firstComplainant?.address),
      type: parsed.type,
      urgency: parsed.urgency,
      status: parsed.status,
      oficioNumber: optionalText(formData, "oficioNumber"),
      expedienteNumber: optionalText(formData, "expedienteNumber"),
      interventionContext: optionalText(formData, "interventionContext"),
      counterpartType: null,
      description: parsed.description,
      guidanceProvided: parsed.guidanceProvided,
      referredToAgency: optionalSentenceText(formData, "referredToAgency"),
      derivedArea,
      confidentialNotes: optionalSentenceText(formData, "confidentialNotes"),
      deadlineAt,
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

  await consumeAttachmentUploads({
    formData,
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
  if (derivedArea) {
    await applyJuridicalReferralFromArea(intervention.id, derivedArea, parsed.description, user.id);
    redirectWithReferralSuccess(`/intervenciones/${intervention.id}`);
  }
  redirect(`/intervenciones/${intervention.id}`);
}

export async function updateJuridicalIntervention(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const before = await juridicalAuditSnapshot(interventionId);
  const parsed = interventionSchema.omit({ description: true }).parse({
    type: text(formData, "type"),
    urgency: text(formData, "urgency") || "MEDIA",
    status: text(formData, "status") || "RECIBIDO",
  });
  const complainants = parseComplainants(formData);
  const noLinkedPerson = checkbox(formData, "noLinkedPerson");
  const linkedPersons = noLinkedPerson ? [] : parseLinkedPersons(formData);
  const firstComplainant = complainants[0];
  const firstLinkedPerson = linkedPersons[0];
  const attendedAt = optionalDate(formData, "attendedAt") ?? before.attendedAt;
  const deadlineAt = optionalDate(formData, "deadlineAt");
  if (Number.isNaN(attendedAt.getTime())) {
    throw new Error("La fecha y hora de atencion no es valida.");
  }
  if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
    throw new Error("El plazo no es valido.");
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
      complainantFirstName: firstComplainant?.isAnonymous ? null : capitalizeOptionalText(firstComplainant?.firstName),
      complainantLastName: firstComplainant?.isAnonymous ? null : capitalizeOptionalText(firstComplainant?.lastName),
      complainantPhone1: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.phone1),
      complainantPhone2: firstComplainant?.isAnonymous ? null : nullable(firstComplainant?.phone2),
      complainantAddress: firstComplainant?.isAnonymous ? null : capitalizeOptionalText(firstComplainant?.address),
      type: parsed.type,
      urgency: parsed.urgency,
      status: parsed.status,
      oficioNumber: optionalText(formData, "oficioNumber"),
      expedienteNumber: optionalText(formData, "expedienteNumber"),
      interventionContext: optionalText(formData, "interventionContext"),
      deadlineAt,
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

export async function addJuridicalObservation(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  if (!canBypassLegajoRestriction(user) && (await isJuridicalLegajoDerivedOut(interventionId))) {
    revalidatePath(`/intervenciones/${interventionId}`);
    redirect(`/intervenciones/${interventionId}`);
  }

  const entityType = text(formData, "entityType");
  const entityId = text(formData, "entityId");
  const content = sentenceText(formData, "content");
  if (content.length < 3) return;

  let belongsToLegajo = false;
  if (entityType === "JuridicalIntervention") {
    belongsToLegajo = entityId === interventionId;
  } else if (entityType === "JuridicalAction") {
    const target = await prisma.juridicalAction.findUnique({
      where: { id: entityId },
      select: { juridicalInterventionId: true },
    });
    belongsToLegajo = target?.juridicalInterventionId === interventionId;
  }
  if (!belongsToLegajo) {
    throw new Error("La linea indicada no pertenece a este legajo.");
  }

  const observation = await prisma.legajoObservation.create({
    data: {
      module: "JURIDICO",
      entityType,
      entityId,
      content,
      createdById: user.id,
    },
  });
  const attachments = await consumeAttachmentUploads({
    formData,
    module: "JURIDICO",
    entityType: "LegajoObservation",
    entityId: observation.id,
    scopeId: interventionId,
    uploadedById: user.id,
    isPrivate: true,
  });

  await writeAuditLog({
    module: "JURIDICO",
    entityType: "JuridicalIntervention",
    entityId: interventionId,
    action: "OBSERVATION",
    createdById: user.id,
    after: { observation, attachments, target: { entityType, entityId } },
  });
  revalidatePath(`/intervenciones/${interventionId}`);
  redirect(`/intervenciones/${interventionId}`);
}

export async function addJuridicalAction(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  if (!canBypassLegajoRestriction(user) && (await isJuridicalLegajoDerivedOut(interventionId))) {
    revalidatePath(`/intervenciones/${interventionId}`);
    redirect(`/intervenciones/${interventionId}`);
  }
  const actionType = text(formData, "actionType") || "SEGUIMIENTO";
  const description = sentenceText(formData, "description") || sentenceText(formData, "content");
  const content = buildJuridicalActionContent({
    description,
    guidanceProvided: optionalSentenceText(formData, "guidanceProvided") ?? "",
    nextStepDescription: optionalSentenceText(formData, "nextStepDescription") ?? "",
  });
  const statusAfter = optionalText(formData, "statusAfter");
  const createdAt = optionalDate(formData, "createdAt") ?? new Date();
  const deadlineAt = optionalDate(formData, "deadlineAt");
  if (!ACTION_TYPES.includes(actionType) || description.length < 3) return;
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error("La fecha y hora de atencion no es valida.");
  }
  if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
    throw new Error("El plazo no es valido.");
  }

  const before = await juridicalAuditSnapshot(interventionId);
  const action = await prisma.juridicalAction.create({
    data: {
      juridicalInterventionId: interventionId,
      actionType,
      content,
      createdAt,
      deadlineAt,
      createdById: user.id,
    },
  });

  let after = before;
  if (statusAfter && JURIDICAL_STATUSES.includes(statusAfter) && statusAfter !== before.status) {
    after = await prisma.juridicalIntervention.update({
      where: { id: interventionId },
      data: { status: statusAfter, lastStatusAt: new Date() },
      include: juridicalAuditInclude,
    });
    await syncJuridicalReferralSummary(interventionId, statusAfter);
  }

  const savedAttachments = await consumeAttachmentUploads({
    formData,
    module: "JURIDICO",
    entityType: "JuridicalAction",
    entityId: action.id,
    scopeId: interventionId,
    uploadedById: user.id,
    isPrivate: true,
  });

  await writeAuditLog({
    module: "JURIDICO",
    entityType: "JuridicalIntervention",
    entityId: interventionId,
    action: after.status !== before.status ? "STATUS_CHANGE" : "ACTION",
    createdById: user.id,
    before,
    after: { intervention: after, action, attachments: savedAttachments },
  });
  revalidatePath(`/intervenciones/${interventionId}`);
  redirect(`/intervenciones/${interventionId}`);
}

export async function deriveJuridicalToDispatch(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  if (await isJuridicalLegajoDerivedOut(interventionId)) {
    revalidatePath(`/intervenciones/${interventionId}`);
    redirect(`/intervenciones/${interventionId}`);
  }
  const source = await prisma.juridicalIntervention.findUniqueOrThrow({
    where: { id: interventionId },
    include: {
      person: true,
      complainants: { orderBy: { sortOrder: "asc" } },
      linkedPersons: { orderBy: { sortOrder: "asc" } },
    },
  });
  const destinationArea = optionalText(formData, "area") ?? "Despacho";
  const submittedSummary = sentenceText(formData, "summary");
  const summary = submittedSummary.length >= 8 ? submittedSummary : referralSummaryFrom(source, destinationArea);
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
      referredArea: destinationArea,
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

  const updatedSource = await prisma.juridicalIntervention.update({
    where: { id: interventionId },
    data: { derivedArea: destinationArea },
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
    after: { intervention: updatedSource, dispatchRecord, referral },
  });
  revalidatePath(`/intervenciones/${interventionId}`);
  redirectWithReferralSuccess(`/intervenciones/${interventionId}`);
}

export async function referJuridicalToArea(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  if (await isJuridicalLegajoDerivedOut(interventionId)) {
    revalidatePath(`/intervenciones/${interventionId}`);
    redirect(`/intervenciones/${interventionId}`);
  }
  const area = text(formData, "area");
  if (!area) return;
  const source = await prisma.juridicalIntervention.findUniqueOrThrow({
    where: { id: interventionId },
    select: { description: true, internalNumber: true },
  });
  const summary = referralSummaryFrom(source, area);

  await applyJuridicalReferralFromArea(interventionId, area, summary, user.id);
  revalidatePath(`/intervenciones/${interventionId}`);
  redirectWithReferralSuccess(`/intervenciones/${interventionId}`);
}

export async function uploadJuridicalAttachment(interventionId: string, formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  if (!canBypassLegajoRestriction(user) && (await isJuridicalLegajoDerivedOut(interventionId))) {
    revalidatePath(`/intervenciones/${interventionId}`);
    redirect(`/intervenciones/${interventionId}`);
  }
  const saved = await consumeAttachmentUploads({
    formData,
    module: "JURIDICO",
    entityType: "JuridicalIntervention",
    entityId: interventionId,
    scopeId: interventionId,
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
