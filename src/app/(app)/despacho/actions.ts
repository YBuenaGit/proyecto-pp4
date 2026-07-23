"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  DISPATCH_STATUSES,
  EXPEDIENT_AREAS,
  EXPEDIENT_STATUSES,
  PRIORITIES,
} from "@/lib/constants";
import { CODIGOS_EXPEDIENTES_SET } from "@/lib/constants/codigosExpedientes";
import {
  checkbox,
  optionalDate,
  optionalSentenceText,
  optionalText,
  sentenceText,
  text,
  nextInternalNumber,
} from "@/lib/form";
import { buildJuridicalActionContent } from "@/lib/juridical-action-content";
import {
  hasIntakeComplainantData,
  hasIntakeLinkedPersonData,
  hasIntakePeopleResolution,
} from "@/lib/intake-validation";
import { consumeAttachmentUploads } from "@/lib/direct-uploads";
import { prisma } from "@/lib/prisma";
import {
  canAccessDispatch,
  canAccessExpedients,
  assertAccess,
  canBypassLegajoRestriction,
} from "@/lib/rbac";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { capitalizeOptionalText, personDisplayName } from "@/lib/text";

const dispatchSchema = z.object({
  description: z.string().trim().min(1),
  category: z.string().min(1),
  priority: z.string().refine((value) => PRIORITIES.includes(value)),
  status: z.string().refine((value) => DISPATCH_STATUSES.includes(value)),
});

const dispatchCreationSchema = dispatchSchema.extend({
  initialGuidance: z.string().trim().min(1),
});

const expedientSchema = z.object({
  expedienteNumber: z.string().trim().min(1, "El numero de expediente es obligatorio."),
  codigo: z
    .string()
    .optional()
    .nullable()
    .refine(
      (value) => !value || CODIGOS_EXPEDIENTES_SET.has(value),
      "Código de expediente inválido.",
    ),
  category: z.string().min(1),
  area: z
    .string()
    .refine((value) => EXPEDIENT_AREAS.some((item) => item.value === value)),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((value) => value ?? ""),
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
  .refine(
    (value) => !value || dniPattern.test(value),
    "El DNI debe tener entre 7 y 8 numeros.",
  );

const optionalPhoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => !value || phonePattern.test(value),
    "El telefono debe tener entre 7 y 10 numeros.",
  );

const optionalNameSchema = z
  .string()
  .trim()
  .refine(
    (value) => !value || namePattern.test(value),
    "El nombre y apellido solo pueden tener letras y espacios.",
  );

const optionalAddressSchema = z
  .string()
  .trim()
  .refine(
    (value) => !value || addressPattern.test(value),
    "El domicilio contiene caracteres no permitidos.",
  );

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
  return z
    .array(complainantPayloadSchema)
    .parse(parseJsonArray(formData, "complainantsPayload"))
    .map((person) =>
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
    )
    .filter(hasIntakeComplainantData);
}

function parseLinkedPersons(formData: FormData) {
  return z
    .array(linkedPersonPayloadSchema)
    .parse(parseJsonArray(formData, "linkedPersonsPayload"))
    .filter(hasIntakeLinkedPersonData);
}

function nullable(value: string) {
  return value.trim() || null;
}

function normalizeReferralArea(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .toLocaleLowerCase("es-AR")
    .trim();
}

function referralSummaryFrom(
  source: { description: string; internalNumber: string },
  area: string,
) {
  const description = source.description.trim();
  return description.length >= 8
    ? description
    : `Derivacion a ${area} desde ${source.internalNumber}.`;
}

function redirectWithReferralSuccess(path: string) {
  redirect(`${path}?derivacion=ok`);
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

function isDirectivoReferralArea(value: string | null | undefined) {
  return normalizeReferralArea(value) === "directivo";
}

function linkedPersonName(
  person:
    | { firstName: string | null; apellidoApodoManual: string | null }
    | undefined,
) {
  if (!person) return null;
  return (
    personDisplayName(person.apellidoApodoManual, person.firstName) || null
  );
}

function complainantCreateData(person: ComplainantPayload, index: number) {
  return {
    sortOrder: index,
    isAnonymous: person.isAnonymous,
    dni: person.isAnonymous ? null : nullable(person.dni),
    firstName: person.isAnonymous
      ? null
      : capitalizeOptionalText(person.firstName),
    lastName: person.isAnonymous
      ? null
      : capitalizeOptionalText(person.lastName),
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

const dispatchAuditInclude = {
  complainants: { orderBy: { sortOrder: "asc" as const } },
  linkedPersons: { orderBy: { sortOrder: "asc" as const } },
};

async function dispatchAuditSnapshot(recordId: string) {
  return prisma.dispatchRecord.findUniqueOrThrow({
    where: { id: recordId },
    include: dispatchAuditInclude,
  });
}

async function syncDispatchReferralSummary(recordId: string, status: string) {
  await prisma.referral.updateMany({
    where: { destinationDispatchRecordId: recordId },
    data: {
      visibleStatusForOrigin: `Despacho: ${status}`,
      status: ["RESUELTO", "CERRADO", "ARCHIVADO"].includes(status)
        ? "CERRADA"
        : "EN_GESTION",
      closedAt: ["RESUELTO", "CERRADO", "ARCHIVADO"].includes(status)
        ? new Date()
        : null,
    },
  });
}

async function isDispatchLegajoDerivedOut(recordId: string) {
  const record = await prisma.dispatchRecord.findUniqueOrThrow({
    where: { id: recordId },
    select: {
      status: true,
      referredArea: true,
      _count: { select: { originReferrals: true } },
    },
  });
  return Boolean(
    record._count.originReferrals ||
    (record.referredArea && record.status === "DERIVADO"),
  );
}

async function createDispatchDirectivoReferral(
  recordId: string,
  summary: string,
  userId: string,
) {
  const before = await prisma.dispatchRecord.findUniqueOrThrow({
    where: { id: recordId },
  });
  const referral = await prisma.referral.create({
    data: {
      originModule: "DESPACHO",
      destinationModule: "DIRECTIVO",
      originDispatchRecordId: recordId,
      summary,
      status: "PENDIENTE",
      visibleStatusForOrigin: "Derivada a Directivo - pendiente de recepcion",
      referredById: userId,
    },
  });
  const after = await prisma.dispatchRecord.update({
    where: { id: recordId },
    data: {
      referredArea: "Directivo",
      status: "DERIVADO",
      lastStatusAt: new Date(),
    },
  });
  const followUp = await prisma.dispatchFollowUp.create({
    data: {
      dispatchRecordId: recordId,
      content: `Derivacion a Directivo: ${summary}`,
      statusAfter: "DERIVADO",
      createdById: userId,
    },
  });

  await writeAuditLog({
    module: "DESPACHO",
    entityType: "Referral",
    entityId: referral.id,
    action: "REFERRAL",
    createdById: userId,
    before,
    after: { record: after, followUp, referral },
  });
}

async function createDispatchExternalAreaReferral(
  recordId: string,
  area: string,
  summary: string,
  userId: string,
  updateStatus: boolean,
) {
  const before = await prisma.dispatchRecord.findUniqueOrThrow({
    where: { id: recordId },
  });
  const statusData = updateStatus
    ? { status: "DERIVADO", lastStatusAt: new Date() }
    : {};
  const after = await prisma.dispatchRecord.update({
    where: { id: recordId },
    data: {
      referredArea: area,
      ...statusData,
    },
  });
  const followUp = await prisma.dispatchFollowUp.create({
    data: {
      dispatchRecordId: recordId,
      content: `Derivado a ${area}. ${summary}`,
      statusAfter: updateStatus ? "DERIVADO" : after.status,
      createdById: userId,
    },
  });
  await writeAuditLog({
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: recordId,
    action: "REFERRAL",
    createdById: userId,
    before,
    after: { record: after, followUp },
  });
}

async function applyDispatchReferralFromArea(
  recordId: string,
  area: string,
  summary: string,
  userId: string,
  updateExternalStatus = true,
) {
  if (isJuridicalReferralArea(area)) {
    const referralData = new FormData();
    referralData.set("summary", summary);
    referralData.set("area", area);
    await deriveDispatchToJuridical(recordId, referralData);
    return;
  }

  if (isDirectivoReferralArea(area)) {
    await createDispatchDirectivoReferral(recordId, summary, userId);
    return;
  }

  await createDispatchExternalAreaReferral(
    recordId,
    area,
    summary,
    userId,
    updateExternalStatus,
  );
}

export async function createDispatchRecord(formData: FormData) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));

  const parsed = dispatchCreationSchema.parse({
    description: sentenceText(formData, "description"),
    initialGuidance: sentenceText(formData, "initialGuidance"),
    category: text(formData, "category"),
    priority: text(formData, "priority") || "MEDIA",
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
  const firstLinkedPerson = linkedPersons[0];
  const referredArea = optionalText(formData, "referredArea");
  const usesHistoricalDate = checkbox(formData, "usesHistoricalDate");
  const attendedAt = usesHistoricalDate
    ? optionalDate(formData, "attendedAt")
    : new Date();
  const deadlineAt = optionalDate(formData, "deadlineAt");
  if (!attendedAt || Number.isNaN(attendedAt.getTime())) {
    throw new Error("La fecha y hora de atención no es válida.");
  }
  if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
    throw new Error("El plazo no es válido.");
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
      initialGuidance: parsed.initialGuidance,
      confidentialNotes: optionalSentenceText(formData, "confidentialNotes"),
      deadlineAt,
      category: parsed.category,
      priority: parsed.priority,
      status: parsed.status,
      referredArea,
      lastStatusAt: attendedAt,
      complainants: {
        create: complainants.map(complainantCreateData),
      },
      linkedPersons: {
        create: linkedPersons.map(linkedPersonCreateData),
      },
    },
  });

  await consumeAttachmentUploads({
    formData,
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

  if (referredArea) {
    await applyDispatchReferralFromArea(
      record.id,
      referredArea,
      parsed.description,
      user.id,
    );
    redirectWithReferralSuccess(`/despacho/${record.id}`);
  }

  redirect(`/despacho/${record.id}`);
}

export async function updateDispatchRecord(
  recordId: string,
  formData: FormData,
) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const before = await dispatchAuditSnapshot(recordId);

  const parsed = dispatchSchema.omit({ description: true }).parse({
    category: text(formData, "category"),
    priority: text(formData, "priority") || "MEDIA",
    status: text(formData, "status") || "RECIBIDO",
  });

  const complainants = parseComplainants(formData);
  const noLinkedPerson = checkbox(formData, "noLinkedPerson");
  const linkedPersons = noLinkedPerson ? [] : parseLinkedPersons(formData);
  const firstLinkedPerson = linkedPersons[0];
  const usesHistoricalDate = checkbox(formData, "usesHistoricalDate");
  const historicalDate = optionalDate(formData, "attendedAt");
  const attendedAt = usesHistoricalDate ? historicalDate : before.attendedAt;
  const deadlineAt = optionalDate(formData, "deadlineAt");
  if (!attendedAt || Number.isNaN(attendedAt.getTime())) {
    throw new Error("La fecha y hora de atención no es válida.");
  }
  if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
    throw new Error("El plazo no es válido.");
  }

  const after = await prisma.dispatchRecord.update({
    where: { id: recordId },
    data: {
      attendedAt,
      usesHistoricalDate,
      personId: null,
      dniSnapshot: firstLinkedPerson?.dni || null,
      nameSnapshot: linkedPersonName(firstLinkedPerson),
      deadlineAt,
      category: parsed.category,
      priority: parsed.priority,
      status: parsed.status,
      referredArea: before.referredArea,
      lastStatusAt:
        before.status !== parsed.status ? new Date() : before.lastStatusAt,
      complainants: {
        deleteMany: {},
        create: complainants.map(complainantCreateData),
      },
      linkedPersons: {
        deleteMany: {},
        create: linkedPersons.map(linkedPersonCreateData),
      },
    },
    include: dispatchAuditInclude,
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

export async function addDispatchFollowUp(
  recordId: string,
  formData: FormData,
) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  if (
    !canBypassLegajoRestriction(user) &&
    (await isDispatchLegajoDerivedOut(recordId))
  ) {
    revalidatePath(`/despacho/${recordId}`);
    redirect(`/despacho/${recordId}`);
  }
  const description =
    sentenceText(formData, "description") || sentenceText(formData, "content");
  if (description.length < 3) return;
  const content = buildJuridicalActionContent({
    description,
    guidanceProvided: optionalSentenceText(formData, "guidanceProvided") ?? "",
  });
  const statusAfter = optionalText(formData, "statusAfter");
  const createdAt = optionalDate(formData, "createdAt") ?? new Date();
  const deadlineAt = optionalDate(formData, "deadlineAt");
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error("La fecha y hora no es válida.");
  }
  if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
    throw new Error("El plazo no es válido.");
  }
  const before = await prisma.dispatchRecord.findUniqueOrThrow({
    where: { id: recordId },
  });

  const followUp = await prisma.dispatchFollowUp.create({
    data: {
      dispatchRecordId: recordId,
      content,
      statusAfter,
      deadlineAt,
      createdAt,
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

  const savedAttachments = await consumeAttachmentUploads({
    formData,
    module: "DESPACHO",
    entityType: "DispatchFollowUp",
    entityId: followUp.id,
    scopeId: recordId,
    uploadedById: user.id,
  });

  await writeAuditLog({
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: recordId,
    action: statusAfter ? "STATUS_CHANGE" : "FOLLOW_UP",
    createdById: user.id,
    before,
    after: { record: after, followUp, attachments: savedAttachments },
  });
  revalidatePath(`/despacho/${recordId}`);
  redirect(`/despacho/${recordId}`);
}

export async function addDispatchObservation(
  recordId: string,
  formData: FormData,
) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  if (
    !canBypassLegajoRestriction(user) &&
    (await isDispatchLegajoDerivedOut(recordId))
  ) {
    revalidatePath(`/despacho/${recordId}`);
    redirect(`/despacho/${recordId}`);
  }

  const entityType = text(formData, "entityType");
  const entityId = text(formData, "entityId");
  const content = sentenceText(formData, "content");
  if (content.length < 3) return;

  let belongsToLegajo = false;
  if (entityType === "DispatchRecord") {
    belongsToLegajo = entityId === recordId;
  } else if (entityType === "DispatchFollowUp") {
    const target = await prisma.dispatchFollowUp.findUnique({
      where: { id: entityId },
      select: { dispatchRecordId: true },
    });
    belongsToLegajo = target?.dispatchRecordId === recordId;
  }
  if (!belongsToLegajo) {
    throw new Error("La linea indicada no pertenece a este legajo.");
  }

  const observation = await prisma.legajoObservation.create({
    data: {
      module: "DESPACHO",
      entityType,
      entityId,
      content,
      createdById: user.id,
    },
  });
  const attachments = await consumeAttachmentUploads({
    formData,
    module: "DESPACHO",
    entityType: "LegajoObservation",
    entityId: observation.id,
    scopeId: recordId,
    scopeEntityType: "DispatchRecord",
    uploadedById: user.id,
  });

  await writeAuditLog({
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: recordId,
    action: "OBSERVATION",
    createdById: user.id,
    after: { observation, attachments, target: { entityType, entityId } },
  });
  revalidatePath(`/despacho/${recordId}`);
  redirect(`/despacho/${recordId}`);
}

export async function referDispatchToArea(
  recordId: string,
  formData: FormData,
) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  if (await isDispatchLegajoDerivedOut(recordId)) {
    revalidatePath(`/despacho/${recordId}`);
    redirect(`/despacho/${recordId}`);
  }
  const area = text(formData, "area");
  if (!area) return;
  const source = await prisma.dispatchRecord.findUniqueOrThrow({
    where: { id: recordId },
    select: { description: true, internalNumber: true },
  });
  const summary = referralSummaryFrom(source, area);

  await applyDispatchReferralFromArea(recordId, area, summary, user.id);
  revalidatePath(`/despacho/${recordId}`);
  redirectWithReferralSuccess(`/despacho/${recordId}`);
}

export async function deriveDispatchToJuridical(
  recordId: string,
  formData: FormData,
) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  if (await isDispatchLegajoDerivedOut(recordId)) {
    revalidatePath(`/despacho/${recordId}`);
    redirect(`/despacho/${recordId}`);
  }
  const type = text(formData, "type") || "PRIMERA_INTERVENCION";
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
  const destinationArea =
    optionalText(formData, "area") ??
    source.referredArea ??
    "Intervenciones Juridico-Institucionales";
  const submittedSummary = sentenceText(formData, "summary");
  const summary =
    submittedSummary.length >= 8
      ? submittedSummary
      : referralSummaryFrom(source, destinationArea);

  const intervention = await prisma.juridicalIntervention.create({
    data: {
      internalNumber: await nextInternalNumber("JI", "juridical"),
      createdById: user.id,
      personId: null,
      dniSnapshot: firstLinkedPerson?.dni ?? source.dniSnapshot,
      nameSnapshot: linkedPersonName(firstLinkedPerson) ?? source.nameSnapshot,
      complainantIsAnonymous: Boolean(complainant?.isAnonymous),
      complainantDni: complainant?.isAnonymous ? null : complainant?.dni,
      complainantFirstName: complainant?.isAnonymous
        ? null
        : complainant?.firstName,
      complainantLastName: complainant?.isAnonymous
        ? null
        : complainant?.lastName,
      complainantPhone1: complainant?.isAnonymous ? null : complainant?.phone1,
      complainantPhone2: complainant?.isAnonymous ? null : complainant?.phone2,
      complainantAddress: complainant?.isAnonymous
        ? null
        : complainant?.address,
      type,
      urgency: source.priority,
      status: "RECIBIDO",
      interventionContext: "ORIENTACION",
      counterpartType: null,
      description: summary,
      guidanceProvided:
        "Derivacion recibida desde Despacho para primera evaluacion.",
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
      visibleStatusForOrigin: `Derivada a ${destinationArea} - pendiente de recepcion`,
      referredById: user.id,
    },
  });

  const after = await prisma.dispatchRecord.update({
    where: { id: recordId },
    data: {
      status: "DERIVADO",
      referredArea: destinationArea,
      lastStatusAt: new Date(),
    },
  });

  await prisma.dispatchFollowUp.create({
    data: {
      dispatchRecordId: recordId,
      content: `Derivacion a ${destinationArea}: ${summary}`,
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
  redirectWithReferralSuccess(`/despacho/${recordId}`);
}

export async function uploadDispatchAttachment(
  recordId: string,
  formData: FormData,
) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  if (
    !canBypassLegajoRestriction(user) &&
    (await isDispatchLegajoDerivedOut(recordId))
  ) {
    revalidatePath(`/despacho/${recordId}`);
    redirect(`/despacho/${recordId}`);
  }
  const saved = await consumeAttachmentUploads({
    formData,
    module: "DESPACHO",
    entityType: "DispatchRecord",
    entityId: recordId,
    scopeId: recordId,
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
    description: optionalSentenceText(formData, "description") ?? "",
    observation: optionalSentenceText(formData, "observation"),
    status: text(formData, "status") || "INICIADO",
  });
  const deadlineAt = optionalDate(formData, "deadlineAt");
  if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
    throw new Error("El plazo no es válido.");
  }

  const expedient = await prisma.internalExpedient.create({
    data: {
      internalNumber: await nextInternalNumber("ADM", "expedient"),
      expedienteNumber: parsed.expedienteNumber,
      codigo: parsed.codigo,
      category: parsed.category,
      area: parsed.area,
      description: parsed.description,
      observation: parsed.observation,
      deadlineAt,
      status: parsed.status,
      createdById: user.id,
    },
  });

  await consumeAttachmentUploads({
    formData,
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
  const parsed = expedientSchema.parse({
    expedienteNumber: optionalText(formData, "expedienteNumber"),
    codigo: optionalText(formData, "codigo"),
    category: text(formData, "category"),
    area: text(formData, "area"),
    description: optionalSentenceText(formData, "description") ?? "",
    observation: optionalSentenceText(formData, "observation"),
    status: text(formData, "status") || "INICIADO",
  });
  const deadlineAt = optionalDate(formData, "deadlineAt");
  if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
    throw new Error("El plazo no es válido.");
  }

  await prisma.$transaction(async (tx) => {
    const before = await tx.internalExpedient.findUniqueOrThrow({
      where: { id: expedientId },
    });
    const hasChanges =
      before.expedienteNumber !== parsed.expedienteNumber ||
      before.codigo !== parsed.codigo ||
      before.category !== parsed.category ||
      before.area !== parsed.area ||
      before.description !== parsed.description ||
      before.observation !== parsed.observation ||
      before.status !== parsed.status ||
      before.deadlineAt?.getTime() !== deadlineAt?.getTime();

    if (!hasChanges) return;

    const after = await tx.internalExpedient.update({
      where: { id: expedientId },
      data: { ...parsed, deadlineAt },
    });
    await tx.auditLog.create({
      data: {
        module: "DESPACHO",
        entityType: "InternalExpedient",
        entityId: expedientId,
        action: before.status !== after.status ? "STATUS_CHANGE" : "UPDATE",
        createdById: user.id,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(after),
      },
    });
  });
  revalidatePath(`/despacho/expedientes/${expedientId}`);
  redirect(`/despacho/expedientes/${expedientId}`);
}

export async function addExpedientFollowUp(
  expedientId: string,
  formData: FormData,
) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const content = sentenceText(formData, "content");
  if (content.length < 3) {
    throw new Error("El seguimiento debe tener al menos tres caracteres.");
  }

  await prisma.$transaction(async (tx) => {
    const expedient = await tx.internalExpedient.findUnique({
      where: { id: expedientId },
      select: { id: true },
    });
    if (!expedient) throw new Error("Expediente no encontrado.");

    const observation = await tx.legajoObservation.create({
      data: {
        module: "DESPACHO",
        entityType: "InternalExpedient",
        entityId: expedientId,
        content,
        createdById: user.id,
      },
    });
    const attachments = await consumeAttachmentUploads({
      formData,
      module: "DESPACHO",
      entityType: "LegajoObservation",
      entityId: observation.id,
      scopeId: expedientId,
      scopeEntityType: "InternalExpedient",
      uploadedById: user.id,
      required: true,
      transaction: tx,
    });

    await tx.auditLog.create({
      data: {
        module: "DESPACHO",
        entityType: "InternalExpedient",
        entityId: expedientId,
        action: "FOLLOW_UP",
        createdById: user.id,
        afterJson: JSON.stringify({ observation, attachments }),
      },
    });
  });

  revalidatePath(`/despacho/expedientes/${expedientId}`);
  redirect(`/despacho/expedientes/${expedientId}`);
}

export async function uploadExpedientAttachment(
  expedientId: string,
  formData: FormData,
) {
  const user = await requireUser();
  assertAccess(canAccessExpedients(user));
  const saved = await consumeAttachmentUploads({
    formData,
    module: "DESPACHO",
    entityType: "InternalExpedient",
    entityId: expedientId,
    scopeId: expedientId,
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
