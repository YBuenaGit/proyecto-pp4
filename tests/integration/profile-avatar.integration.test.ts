import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

test.after(async () => {
  await prisma.$disconnect();
});

test("integra la relacion entre usuario y avatar sin dejar referencias rotas", async () => {
  const suffix = randomUUID();
  let userId: string | undefined;
  let attachmentId: string | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: "Prueba Integracion Avatar",
        username: `integration-avatar-${suffix}`,
        passwordHash: "integration-test-only",
        role: "operador",
      },
    });
    userId = user.id;

    const attachment = await prisma.attachment.create({
      data: {
        module: "PERFIL",
        entityType: "UserAvatar",
        entityId: user.id,
        fileName: "avatar.webp",
        originalName: "avatar.webp",
        objectKey: `integration/avatar/${suffix}`,
        encryptionVersion: 0,
        mimeType: "image/webp",
        size: 128,
        isPrivate: true,
        uploadedById: user.id,
      },
    });
    attachmentId = attachment.id;

    const linked = await prisma.user.update({
      where: { id: user.id },
      data: { avatarAttachmentId: attachment.id },
      include: { avatarAttachment: true },
    });
    assert.equal(linked.avatarAttachment?.id, attachment.id);

    await prisma.attachment.delete({ where: { id: attachment.id } });
    attachmentId = undefined;
    const afterDelete = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(afterDelete?.avatarAttachmentId, null);
  } finally {
    if (userId) {
      await prisma.user.updateMany({
        where: { id: userId },
        data: { avatarAttachmentId: null },
      });
    }
    if (attachmentId) {
      await prisma.attachment.deleteMany({ where: { id: attachmentId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});
