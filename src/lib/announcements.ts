import "server-only";

import { z } from "zod";
import { prisma } from "./prisma";
import type {
  AnnouncementAttachmentItem,
  AnnouncementItem,
} from "./announcement-types";

export const announcementInputSchema = z.object({
  title: z.string().trim().min(3, "El titulo debe tener al menos 3 caracteres.").max(160),
  content: z.string().trim().min(3, "El contenido debe tener al menos 3 caracteres.").max(10_000),
});

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: { avatarAttachmentId: string | null };
};

function groupAttachments(
  attachments: Array<AnnouncementAttachmentItem & { entityId: string }>,
) {
  const grouped = new Map<string, AnnouncementAttachmentItem[]>();
  attachments.forEach(({ entityId, ...attachment }) => {
    const current = grouped.get(entityId) ?? [];
    current.push(attachment);
    grouped.set(entityId, current);
  });
  return grouped;
}

function serializeAnnouncement(
  announcement: AnnouncementRow,
  attachments: AnnouncementAttachmentItem[],
): AnnouncementItem {
  const { createdBy, ...historicalFields } = announcement;
  return {
    ...historicalFields,
    authorAvatarAttachmentId: createdBy.avatarAttachmentId,
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
    deletedAt: announcement.deletedAt?.toISOString() ?? null,
    attachments,
  };
}

export async function listAnnouncements(deleted: boolean) {
  const announcements = await prisma.announcement.findMany({
    where: deleted ? { deletedAt: { not: null } } : { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { avatarAttachmentId: true } },
    },
  });
  if (!announcements.length) return [];

  const attachments = await prisma.attachment.findMany({
    where: {
      module: "ANUNCIOS",
      entityType: "Announcement",
      entityId: { in: announcements.map((announcement) => announcement.id) },
    },
    select: {
      id: true,
      entityId: true,
      originalName: true,
      mimeType: true,
      size: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const attachmentsByAnnouncement = groupAttachments(attachments);

  return announcements.map((announcement) =>
    serializeAnnouncement(
      announcement,
      attachmentsByAnnouncement.get(announcement.id) ?? [],
    ),
  );
}
