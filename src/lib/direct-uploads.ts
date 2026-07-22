import "server-only";

import { randomUUID } from "node:crypto";
import type { CurrentUser } from "./types";
import {
  DIRECT_UPLOAD_PART_BYTES,
  MAX_DIRECT_UPLOAD_FILE_BYTES,
  MAX_DIRECT_UPLOAD_FILES,
  directUploadPartCount,
  type DirectUploadIntent,
} from "./direct-upload-shared";
import {
  buildCloudflareR2ObjectKey,
  getCloudflareR2Storage,
  sanitizeFileName,
} from "./cloudflare-r2";
import { prisma } from "./prisma";
import {
  canAccessDispatch,
  canAccessExpedients,
  canAccessJuridical,
  canAccessRetentions,
  canBypassLegajoRestriction,
} from "./rbac";

const UPLOAD_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export class DirectUploadError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "DirectUploadError";
  }
}

function assertIntentShape(intent: DirectUploadIntent) {
  const valid =
    (intent.module === "DESPACHO" && [
      "DispatchRecord",
      "DispatchFollowUp",
      "InternalExpedient",
      "LegajoObservation",
    ].includes(intent.entityType)) ||
    (intent.module === "JURIDICO" && [
      "JuridicalIntervention",
      "JuridicalAction",
      "LegajoObservation",
    ].includes(intent.entityType)) ||
    (intent.module === "ANUNCIOS" && intent.entityType === "Announcement") ||
    (intent.module === "RETENCIONES" && intent.entityType === "Retention");
  if (!valid) throw new DirectUploadError("Destino de archivo invalido.");
}

async function isDispatchDerivedOut(recordId: string) {
  const record = await prisma.dispatchRecord.findUnique({
    where: { id: recordId },
    select: {
      status: true,
      referredArea: true,
      _count: { select: { originReferrals: true } },
    },
  });
  if (!record) throw new DirectUploadError("Legajo no encontrado.", 404);
  return Boolean(
    record._count.originReferrals ||
      (record.referredArea && record.status === "DERIVADO"),
  );
}

async function isJuridicalDerivedOut(interventionId: string) {
  const intervention = await prisma.juridicalIntervention.findUnique({
    where: { id: interventionId },
    select: {
      derivedArea: true,
      _count: { select: { originReferrals: true } },
    },
  });
  if (!intervention) throw new DirectUploadError("Legajo no encontrado.", 404);
  return Boolean(intervention.derivedArea || intervention._count.originReferrals);
}

export async function assertDirectUploadAccess(user: CurrentUser, intent: DirectUploadIntent) {
  assertIntentShape(intent);

  if (intent.module === "ANUNCIOS") {
    if (intent.scopeId) {
      throw new DirectUploadError("Los archivos de un anuncio existente no se pueden reemplazar.");
    }
    return;
  }

  if (intent.module === "DESPACHO") {
    const isExpedient = intent.entityType === "InternalExpedient";
    if (!(isExpedient ? canAccessExpedients(user) : canAccessDispatch(user))) {
      throw new DirectUploadError("No autorizado.", 404);
    }
    if (!intent.scopeId) return;
    if (isExpedient) {
      const exists = await prisma.internalExpedient.findUnique({
        where: { id: intent.scopeId },
        select: { id: true },
      });
      if (!exists) throw new DirectUploadError("Expediente no encontrado.", 404);
      return;
    }
    if (!canBypassLegajoRestriction(user) && (await isDispatchDerivedOut(intent.scopeId))) {
      throw new DirectUploadError("El legajo derivado no admite nuevos archivos.", 403);
    }
    return;
  }

  if (intent.module === "JURIDICO") {
    if (!canAccessJuridical(user)) throw new DirectUploadError("No autorizado.", 404);
    if (
      intent.scopeId &&
      !canBypassLegajoRestriction(user) &&
      (await isJuridicalDerivedOut(intent.scopeId))
    ) {
      throw new DirectUploadError("El legajo derivado no admite nuevos archivos.", 403);
    }
    return;
  }

  if (!canAccessRetentions(user)) throw new DirectUploadError("No autorizado.", 404);
  if (intent.scopeId) {
    const exists = await prisma.retention.findUnique({
      where: { id: intent.scopeId },
      select: { id: true },
    });
    if (!exists) throw new DirectUploadError("Retencion no encontrada.", 404);
  }
}

export async function initiateDirectUpload(input: {
  user: CurrentUser;
  intent: DirectUploadIntent;
  originalName: string;
  mimeType: string;
  size: number;
}) {
  await assertDirectUploadAccess(input.user, input.intent);
  if (!input.originalName.trim() || input.originalName.length > 255) {
    throw new DirectUploadError("Nombre de archivo invalido.");
  }
  if (!Number.isInteger(input.size) || input.size <= 0 || input.size > MAX_DIRECT_UPLOAD_FILE_BYTES) {
    throw new DirectUploadError("Cada archivo puede pesar como maximo 1 GB.");
  }

  const requestedMimeType = input.mimeType.trim().toLowerCase();
  if (
    input.intent.module === "ANUNCIOS" &&
    requestedMimeType !== "application/pdf" &&
    !requestedMimeType.startsWith("image/") &&
    !requestedMimeType.startsWith("video/")
  ) {
    throw new DirectUploadError("Los anuncios solo admiten imagenes, PDF o videos.");
  }

  const id = randomUUID();
  const objectKey = buildCloudflareR2ObjectKey();
  const originalName = input.originalName.trim();
  const mimeType = requestedMimeType.slice(0, 150) || "application/octet-stream";
  const storage = getCloudflareR2Storage();
  const multipartId = await storage.createMultipartUpload({
    objectKey,
    contentType: mimeType,
    originalName,
    uploadSessionId: id,
  });

  try {
    await prisma.uploadSession.create({
      data: {
        id,
        module: input.intent.module,
        entityType: input.intent.entityType,
        scopeId: input.intent.scopeId || null,
        objectKey,
        multipartId,
        originalName,
        fileName: sanitizeFileName(originalName),
        mimeType,
        size: input.size,
        createdById: input.user.id,
        expiresAt: new Date(Date.now() + UPLOAD_SESSION_TTL_MS),
      },
    });
  } catch (error) {
    await storage.abortMultipartUpload(objectKey, multipartId).catch(() => undefined);
    throw error;
  }

  return {
    id,
    partSize: DIRECT_UPLOAD_PART_BYTES,
    partCount: directUploadPartCount(input.size),
  };
}

async function ownedPendingSession(id: string, userId: string) {
  const session = await prisma.uploadSession.findFirst({
    where: { id, createdById: userId },
  });
  if (!session) throw new DirectUploadError("Carga no encontrada.", 404);
  if (session.expiresAt <= new Date()) throw new DirectUploadError("La carga vencio.", 410);
  if (session.status !== "PENDING") throw new DirectUploadError("La carga ya fue finalizada.", 409);
  return session;
}

export async function getDirectUploadPartUrls(input: {
  sessionId: string;
  userId: string;
  partNumbers: number[];
}) {
  const session = await ownedPendingSession(input.sessionId, input.userId);
  const partCount = directUploadPartCount(session.size);
  const partNumbers = [...new Set(input.partNumbers)];
  if (
    !partNumbers.length ||
    partNumbers.length > partCount ||
    partNumbers.some((part) => !Number.isInteger(part) || part < 1 || part > partCount)
  ) {
    throw new DirectUploadError("Partes de archivo invalidas.");
  }
  const storage = getCloudflareR2Storage();
  return Promise.all(partNumbers.map(async (partNumber) => ({
    partNumber,
    url: await storage.getUploadPartUrl({
      objectKey: session.objectKey,
      multipartId: session.multipartId,
      partNumber,
    }),
  })));
}

export async function completeDirectUpload(input: {
  sessionId: string;
  userId: string;
  parts: Array<{ partNumber: number; eTag: string }>;
}) {
  const session = await ownedPendingSession(input.sessionId, input.userId);
  const expectedPartCount = directUploadPartCount(session.size);
  const parts = [...input.parts]
    .map((part) => ({ partNumber: part.partNumber, eTag: part.eTag.trim() }))
    .sort((a, b) => a.partNumber - b.partNumber);
  if (
    parts.length !== expectedPartCount ||
    parts.some((part, index) => part.partNumber !== index + 1 || !part.eTag)
  ) {
    throw new DirectUploadError("La lista de partes esta incompleta.");
  }

  const storage = getCloudflareR2Storage();
  await storage.completeMultipartUpload({
    objectKey: session.objectKey,
    multipartId: session.multipartId,
    parts,
  });
  const head = await storage.headFile(session.objectKey);
  const uploadSessionId = head.Metadata?.uploadsessionid ?? head.Metadata?.uploadSessionId;
  if (head.ContentLength !== session.size || uploadSessionId !== session.id) {
    await storage.deleteFile(session.objectKey).catch(() => undefined);
    await prisma.uploadSession.update({
      where: { id: session.id },
      data: { status: "FAILED" },
    });
    throw new DirectUploadError("El archivo recibido no coincide con la carga autorizada.");
  }

  await prisma.uploadSession.update({
    where: { id: session.id },
    data: { status: "READY", completedAt: new Date() },
  });
  return { id: session.id };
}

export async function cancelDirectUpload(sessionId: string, userId: string) {
  const session = await prisma.uploadSession.findFirst({
    where: { id: sessionId, createdById: userId },
  });
  if (!session || session.status === "CONSUMED") return;
  const storage = getCloudflareR2Storage();
  if (session.status === "PENDING") {
    await storage.abortMultipartUpload(session.objectKey, session.multipartId).catch(() => undefined);
  } else if (session.status === "READY") {
    await storage.deleteFile(session.objectKey).catch(() => undefined);
  }
  await prisma.uploadSession.update({
    where: { id: session.id },
    data: { status: "CANCELED" },
  });
}

export async function cleanupExpiredDirectUploads(limit = 100) {
  const sessions = await prisma.uploadSession.findMany({
    where: {
      expiresAt: { lt: new Date() },
      status: { in: ["PENDING", "READY"] },
    },
    orderBy: { expiresAt: "asc" },
    take: Math.max(1, Math.min(limit, 500)),
  });
  const storage = getCloudflareR2Storage();
  let cleaned = 0;
  let failed = 0;

  for (const session of sessions) {
    try {
      if (session.status === "PENDING") {
        await storage.abortMultipartUpload(session.objectKey, session.multipartId);
      } else {
        await storage.deleteFile(session.objectKey);
      }
      await prisma.uploadSession.updateMany({
        where: { id: session.id, status: session.status },
        data: { status: "CANCELED" },
      });
      cleaned += 1;
    } catch {
      failed += 1;
    }
  }

  return { scanned: sessions.length, cleaned, failed };
}

function uploadSessionIds(formData: FormData) {
  return formData
    .getAll("uploadSessionIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value));
}

async function readySessions(input: {
  ids: string[];
  uploadedById: string;
  module: string;
  entityType: string;
  scopeId?: string;
}) {
  if (input.ids.length > MAX_DIRECT_UPLOAD_FILES || new Set(input.ids).size !== input.ids.length) {
    throw new DirectUploadError(`Se permiten hasta ${MAX_DIRECT_UPLOAD_FILES} archivos por envio.`);
  }
  if (!input.ids.length) return [];
  const sessions = await prisma.uploadSession.findMany({
    where: { id: { in: input.ids } },
  });
  const byId = new Map(sessions.map((session) => [session.id, session]));
  return input.ids.map((id) => {
    const session = byId.get(id);
    if (
      !session ||
      session.createdById !== input.uploadedById ||
      session.status !== "READY" ||
      session.expiresAt <= new Date() ||
      session.module !== input.module ||
      session.entityType !== input.entityType ||
      (session.scopeId ?? undefined) !== input.scopeId
    ) {
      throw new DirectUploadError("Uno de los archivos no pertenece a este formulario.");
    }
    return session;
  });
}

export async function consumeAttachmentUploads(input: {
  formData: FormData;
  module: string;
  entityType: string;
  entityId: string;
  scopeId?: string;
  uploadedById: string;
  isPrivate?: boolean;
}) {
  const sessions = await readySessions({
    ids: uploadSessionIds(input.formData),
    uploadedById: input.uploadedById,
    module: input.module,
    entityType: input.entityType,
    scopeId: input.scopeId,
  });
  if (!sessions.length) return [];
  return prisma.$transaction(async (tx) => {
    const attachments = [];
    for (const session of sessions) {
      attachments.push(await tx.attachment.create({
        data: {
          module: input.module,
          entityType: input.entityType,
          entityId: input.entityId,
          fileName: session.fileName,
          originalName: session.originalName,
          objectKey: session.objectKey,
          encryptionVersion: 0,
          mimeType: session.mimeType,
          size: session.size,
          uploadedById: input.uploadedById,
          isPrivate: Boolean(input.isPrivate),
        },
      }));
      await tx.uploadSession.update({
        where: { id: session.id },
        data: { status: "CONSUMED", consumedAt: new Date() },
      });
    }
    return attachments;
  });
}

export async function consumeRetentionUploads(input: {
  uploadSessionIds: string[];
  retentionId: string;
  uploadedById: string;
  scopeId?: string;
}) {
  const sessions = await readySessions({
    ids: input.uploadSessionIds,
    uploadedById: input.uploadedById,
    module: "RETENCIONES",
    entityType: "Retention",
    scopeId: input.scopeId,
  });
  if (!sessions.length) return [];
  return prisma.$transaction(async (tx) => {
    const attachments = [];
    for (const session of sessions) {
      attachments.push(await tx.retentionAttachment.create({
        data: {
          retentionId: input.retentionId,
          objectKey: session.objectKey,
          encryptionVersion: 0,
          fileName: session.fileName,
          originalName: session.originalName,
          mimeType: session.mimeType,
          size: session.size,
          uploadedById: input.uploadedById,
        },
      }));
      await tx.uploadSession.update({
        where: { id: session.id },
        data: { status: "CONSUMED", consumedAt: new Date() },
      });
    }
    return attachments;
  });
}
