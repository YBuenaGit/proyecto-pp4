"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCloudflareR2Storage } from "@/lib/cloudflare-r2";
import {
  consumeAttachmentUploads,
  DirectUploadError,
} from "@/lib/direct-uploads";
import { prisma } from "@/lib/prisma";
import type { ProfileAvatarActionState } from "@/lib/profile-types";

function state(
  status: ProfileAvatarActionState["status"],
  message: string,
): ProfileAvatarActionState {
  return { status, message, nonce: Date.now() };
}

export async function updateProfileAvatar(
  _previousState: ProfileAvatarActionState,
  formData: FormData,
): Promise<ProfileAvatarActionState> {
  const user = await requireUser();
  const uploadSessionIds = formData
    .getAll("uploadSessionIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value));
  if (uploadSessionIds.length !== 1) {
    return state("error", "Selecciona una sola imagen de perfil.");
  }

  const before = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarAttachmentId: true },
  });
  if (!before) return state("error", "No se encontro el usuario.");

  let createdAttachmentId: string | undefined;
  try {
    const attachments = await consumeAttachmentUploads({
      formData,
      module: "PERFIL",
      entityType: "UserAvatar",
      entityId: user.id,
      scopeId: user.id,
      uploadedById: user.id,
      isPrivate: true,
    });
    const attachment = attachments[0];
    if (!attachment || attachments.length !== 1) {
      return state("error", "No se pudo vincular la imagen de perfil.");
    }
    createdAttachmentId = attachment.id;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { avatarAttachmentId: attachment.id },
      }),
      prisma.auditLog.create({
        data: {
          module: "PERFIL",
          entityType: "User",
          entityId: user.id,
          action: "UPDATE_AVATAR",
          beforeJson: JSON.stringify({ avatarAttachmentId: before.avatarAttachmentId }),
          afterJson: JSON.stringify({ avatarAttachmentId: attachment.id }),
          createdById: user.id,
        },
      }),
    ]);
  } catch (error) {
    if (createdAttachmentId) {
      const created = await prisma.attachment.findUnique({
        where: { id: createdAttachmentId },
      });
      if (created) {
        await getCloudflareR2Storage().deleteFile(created.objectKey).catch(() => undefined);
        await prisma.attachment.deleteMany({ where: { id: created.id } });
      }
    }
    return state(
      "error",
      error instanceof DirectUploadError
        ? error.message
        : "No se pudo actualizar la imagen de perfil.",
    );
  }

  if (before.avatarAttachmentId && before.avatarAttachmentId !== createdAttachmentId) {
    const oldAttachment = await prisma.attachment.findFirst({
      where: {
        id: before.avatarAttachmentId,
        module: "PERFIL",
        entityType: "UserAvatar",
        entityId: user.id,
      },
    });
    if (oldAttachment) {
      const removedFromR2 = await getCloudflareR2Storage()
        .deleteFile(oldAttachment.objectKey)
        .then(() => true)
        .catch(() => false);
      if (removedFromR2) {
        await prisma.attachment.deleteMany({ where: { id: oldAttachment.id } });
      }
    }
  }

  revalidatePath("/", "layout");
  return state("success", "Imagen de perfil actualizada.");
}
