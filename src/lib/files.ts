import "server-only";

import { collectUploadFiles, getCloudflareR2Storage } from "./cloudflare-r2";
import { prisma } from "./prisma";

export async function saveAttachments(input: {
  files: FormDataEntryValue[];
  module: string;
  entityType: string;
  entityId: string;
  uploadedById: string;
  isPrivate?: boolean;
}) {
  const files = collectUploadFiles(input.files);
  const storage = getCloudflareR2Storage();
  const saved = [];
  for (const file of files) {
    const uploaded = await storage.uploadFile({ file });

    const attachment = await prisma.attachment.create({
      data: {
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId,
        fileName: uploaded.fileName,
        originalName: uploaded.originalName,
        objectKey: uploaded.objectKey,
        encryptionVersion: uploaded.encryptionVersion,
        mimeType: uploaded.contentType,
        size: uploaded.size,
        uploadedById: input.uploadedById,
        isPrivate: Boolean(input.isPrivate),
      },
    });
    saved.push(attachment);
  }
  return saved;
}
