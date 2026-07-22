"use server";

import { revalidatePath } from "next/cache";
import { ROLE_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { announcementInputSchema } from "@/lib/announcements";
import type { AnnouncementActionState } from "@/lib/announcement-types";
import { getCloudflareR2Storage } from "@/lib/cloudflare-r2";
import {
  consumeAttachmentUploads,
  DirectUploadError,
} from "@/lib/direct-uploads";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

function state(
  status: AnnouncementActionState["status"],
  message: string,
): AnnouncementActionState {
  return { status, message, nonce: Date.now() };
}

function parseAnnouncement(formData: FormData) {
  return announcementInputSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
  });
}

function validationMessage(result: ReturnType<typeof parseAnnouncement>) {
  if (result.success) return "";
  return result.error.issues[0]?.message ?? "Revisa los datos del anuncio.";
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof DirectUploadError) return error.message;
  return fallback;
}

export async function createAnnouncement(
  _previousState: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const user = await requireUser();
  const parsed = parseAnnouncement(formData);
  if (!parsed.success) return state("error", validationMessage(parsed));

  const announcement = await prisma.announcement.create({
    data: {
      ...parsed.data,
      authorName: user.name,
      authorRole: ROLE_LABELS[user.role] ?? user.role,
      createdById: user.id,
    },
  });

  try {
    await consumeAttachmentUploads({
      formData,
      module: "ANUNCIOS",
      entityType: "Announcement",
      entityId: announcement.id,
      uploadedById: user.id,
      isPrivate: true,
    });
  } catch (error) {
    await prisma.announcement.delete({ where: { id: announcement.id } });
    return state("error", actionError(error, "No se pudieron vincular los archivos al anuncio."));
  }

  await writeAuditLog({
    module: "ANUNCIOS",
    entityType: "Announcement",
    entityId: announcement.id,
    action: "CREATE",
    createdById: user.id,
    after: announcement,
  });
  revalidatePath("/");
  return state("success", "Publicacion creada exitosamente.");
}

export async function updateAnnouncement(
  announcementId: string,
  _previousState: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return state("error", "No autorizado.");
  const parsed = parseAnnouncement(formData);
  if (!parsed.success) return state("error", validationMessage(parsed));

  const before = await prisma.announcement.findFirst({
    where: { id: announcementId, deletedAt: null },
  });
  if (!before) return state("error", "El anuncio no existe o fue eliminado.");

  const after = await prisma.announcement.update({
    where: { id: announcementId },
    data: parsed.data,
  });
  await writeAuditLog({
    module: "ANUNCIOS",
    entityType: "Announcement",
    entityId: announcementId,
    action: "UPDATE",
    createdById: user.id,
    before,
    after,
  });
  revalidatePath("/");
  return state("success", "Anuncio actualizado exitosamente.");
}

export async function deleteAnnouncement(
  announcementId: string,
): Promise<AnnouncementActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return state("error", "No autorizado.");
  const before = await prisma.announcement.findFirst({
    where: { id: announcementId, deletedAt: null },
  });
  if (!before) return state("error", "El anuncio no existe o ya fue eliminado.");

  const after = await prisma.announcement.update({
    where: { id: announcementId },
    data: { deletedAt: new Date() },
  });
  await writeAuditLog({
    module: "ANUNCIOS",
    entityType: "Announcement",
    entityId: announcementId,
    action: "DELETE",
    createdById: user.id,
    before,
    after,
  });
  revalidatePath("/");
  return state("success", "Anuncio enviado a la papelera.");
}

export async function restoreAnnouncement(
  announcementId: string,
): Promise<AnnouncementActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return state("error", "No autorizado.");
  const before = await prisma.announcement.findFirst({
    where: { id: announcementId, deletedAt: { not: null } },
  });
  if (!before) return state("error", "El anuncio no existe en la papelera.");

  const after = await prisma.announcement.update({
    where: { id: announcementId },
    data: { deletedAt: null },
  });
  await writeAuditLog({
    module: "ANUNCIOS",
    entityType: "Announcement",
    entityId: announcementId,
    action: "RESTORE",
    createdById: user.id,
    before,
    after,
  });
  revalidatePath("/");
  return state("success", "Anuncio restaurado exitosamente.");
}

export async function permanentlyDeleteAnnouncement(
  announcementId: string,
): Promise<AnnouncementActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return state("error", "No autorizado.");
  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, deletedAt: { not: null } },
  });
  if (!announcement) return state("error", "El anuncio no existe en la papelera.");

  const attachments = await prisma.attachment.findMany({
    where: {
      module: "ANUNCIOS",
      entityType: "Announcement",
      entityId: announcementId,
    },
  });
  const storage = getCloudflareR2Storage();
  try {
    await Promise.all(
      attachments.map((attachment) => storage.deleteFile(attachment.objectKey)),
    );
  } catch {
    return state("error", "No se pudieron eliminar todos los archivos de Cloudflare R2.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.attachment.deleteMany({
      where: {
        module: "ANUNCIOS",
        entityType: "Announcement",
        entityId: announcementId,
      },
    });
    await tx.announcement.delete({ where: { id: announcementId } });
    await tx.auditLog.create({
      data: {
        module: "ANUNCIOS",
        entityType: "Announcement",
        entityId: announcementId,
        action: "PERMANENT_DELETE",
        beforeJson: JSON.stringify({ announcement, attachments }),
        createdById: user.id,
      },
    });
  });
  revalidatePath("/");
  return state("success", "Anuncio eliminado definitivamente.");
}
