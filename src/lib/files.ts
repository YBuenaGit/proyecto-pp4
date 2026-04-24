import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export async function saveAttachments(input: {
  files: FormDataEntryValue[];
  module: string;
  entityType: string;
  entityId: string;
  uploadedById: string;
  isPrivate?: boolean;
}) {
  const saved = [];
  for (const entry of input.files) {
    if (!(entry instanceof File) || entry.size === 0) continue;

    const timestamp = Date.now();
    const originalName = entry.name || "adjunto";
    const fileName = `${timestamp}-${sanitizeFileName(originalName)}`;
    const relativePath = path.join(
      "storage",
      "uploads",
      input.module.toLowerCase(),
      input.entityId,
      fileName,
    );
    const absolutePath = path.join(process.cwd(), relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    const buffer = Buffer.from(await entry.arrayBuffer());
    await writeFile(absolutePath, buffer);

    const attachment = await prisma.attachment.create({
      data: {
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId,
        fileName,
        originalName,
        filePath: relativePath,
        mimeType: entry.type || "application/octet-stream",
        size: entry.size,
        uploadedById: input.uploadedById,
        isPrivate: Boolean(input.isPrivate),
      },
    });
    saved.push(attachment);
  }
  return saved;
}
