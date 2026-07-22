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

test("integra alta, edicion, papelera y restauracion de anuncios", async () => {
  const suffix = randomUUID();
  const username = `integration-announcement-${suffix}`;
  let userId: string | undefined;
  let announcementId: string | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: "Prueba Integracion Anuncios",
        username,
        passwordHash: "integration-test-only",
        role: "operador",
      },
    });
    userId = user.id;

    const created = await prisma.announcement.create({
      data: {
        title: "Anuncio temporal",
        content: "Contenido temporal de la prueba de integracion.",
        authorName: user.name,
        authorRole: "Operador",
        createdById: user.id,
      },
    });
    announcementId = created.id;
    assert.equal(created.deletedAt, null);

    const updated = await prisma.announcement.update({
      where: { id: created.id },
      data: { title: "Anuncio temporal actualizado" },
    });
    assert.equal(updated.title, "Anuncio temporal actualizado");

    const deleted = await prisma.announcement.update({
      where: { id: created.id },
      data: { deletedAt: new Date() },
    });
    assert.ok(deleted.deletedAt);

    const restored = await prisma.announcement.update({
      where: { id: created.id },
      data: { deletedAt: null },
    });
    assert.equal(restored.deletedAt, null);

    await prisma.announcement.delete({ where: { id: created.id } });
    announcementId = undefined;
    assert.equal(
      await prisma.announcement.findUnique({ where: { id: created.id } }),
      null,
    );
  } finally {
    if (announcementId) {
      await prisma.announcement.deleteMany({ where: { id: announcementId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});
