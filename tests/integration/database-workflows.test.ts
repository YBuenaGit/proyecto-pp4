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

test("integra el CRUD de una cita con PostgreSQL", async () => {
  const suffix = randomUUID();
  const username = `integration-agenda-${suffix}`;
  const caseId = `INTEGRATION-AGENDA-${suffix}`;
  let userId: string | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: "Prueba Integracion Agenda",
        username,
        passwordHash: "integration-test-only",
        role: "admin",
      },
    });
    userId = user.id;

    const created = await prisma.appointment.create({
      data: {
        title: "Cita temporal de integracion",
        date: "2099-12-01",
        startTime: "09:00",
        endTime: "09:30",
        calendarScope: "personal",
        ownerUserId: user.id,
        createdByUserId: user.id,
        assignedUserId: user.id,
        type: "CONSULTA",
        status: "PENDIENTE",
        caseId,
      },
    });

    const read = await prisma.appointment.findUnique({
      where: { id: created.id },
      include: { createdBy: true, owner: true },
    });
    assert.equal(read?.caseId, caseId);
    assert.equal(read?.createdBy.username, username);
    assert.equal(read?.owner?.id, user.id);

    const updated = await prisma.appointment.update({
      where: { id: created.id },
      data: { status: "CONFIRMADO", notes: "Actualizada por la prueba de integracion." },
    });
    assert.equal(updated.status, "CONFIRMADO");

    await prisma.appointment.delete({ where: { id: created.id } });
    assert.equal(await prisma.appointment.findUnique({ where: { id: created.id } }), null);
  } finally {
    await prisma.appointment.deleteMany({ where: { caseId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});

test("integra una derivacion entre Despacho y Juridico", async () => {
  const suffix = randomUUID();
  const internalSuffix = suffix.slice(0, 12).toUpperCase();
  const username = `integration-referral-${suffix}`;
  const dispatchNumber = `IT-DES-${internalSuffix}`;
  const juridicalNumber = `IT-JUR-${internalSuffix}`;
  const dni = String(Date.now()).slice(-8);
  let userId: string | undefined;
  let personId: string | undefined;
  let dispatchId: string | undefined;
  let juridicalId: string | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        name: "Prueba Integracion Derivacion",
        username,
        passwordHash: "integration-test-only",
        role: "directivo",
      },
    });
    userId = user.id;

    const person = await prisma.externalPerson.create({
      data: {
        dni,
        firstName: "Persona",
        lastName: "Integracion",
        fullNameNormalized: "persona integracion",
      },
    });
    personId = person.id;

    const dispatch = await prisma.dispatchRecord.create({
      data: {
        internalNumber: dispatchNumber,
        createdById: user.id,
        personId: person.id,
        dniSnapshot: dni,
        nameSnapshot: "Persona Integracion",
        description: "Registro temporal creado por una prueba de integracion.",
        category: "RECLAMO",
        priority: "MEDIA",
        status: "EN_GESTION",
      },
    });
    dispatchId = dispatch.id;

    const juridical = await prisma.juridicalIntervention.create({
      data: {
        internalNumber: juridicalNumber,
        createdById: user.id,
        personId: person.id,
        dniSnapshot: dni,
        nameSnapshot: "Persona Integracion",
        type: "ASESORAMIENTO",
        urgency: "MEDIA",
        status: "RECIBIDO",
        description: "Destino temporal creado por una prueba de integracion.",
        origin: "DERIVACION",
      },
    });
    juridicalId = juridical.id;

    const referral = await prisma.referral.create({
      data: {
        originModule: "DESPACHO",
        destinationModule: "JURIDICO",
        originDispatchRecordId: dispatch.id,
        destinationJuridicalInterventionId: juridical.id,
        summary: "Derivacion temporal para comprobar la integracion entre modulos.",
        status: "RECIBIDA",
        visibleStatusForOrigin: "Recibida por Juridico",
        referredById: user.id,
      },
    });

    const linked = await prisma.referral.findUnique({
      where: { id: referral.id },
      include: {
        originDispatchRecord: true,
        destinationJuridicalIntervention: true,
        referredBy: true,
      },
    });

    assert.equal(linked?.originDispatchRecord?.internalNumber, dispatchNumber);
    assert.equal(linked?.destinationJuridicalIntervention?.internalNumber, juridicalNumber);
    assert.equal(linked?.destinationJuridicalIntervention?.personId, person.id);
    assert.equal(linked?.referredBy.username, username);
    assert.equal(linked?.visibleStatusForOrigin, "Recibida por Juridico");

    await prisma.referral.delete({ where: { id: referral.id } });
    assert.equal(await prisma.referral.findUnique({ where: { id: referral.id } }), null);
  } finally {
    if (dispatchId || juridicalId) {
      await prisma.referral.deleteMany({
        where: {
          OR: [
            ...(dispatchId ? [{ originDispatchRecordId: dispatchId }, { destinationDispatchRecordId: dispatchId }] : []),
            ...(juridicalId
              ? [
                  { originJuridicalInterventionId: juridicalId },
                  { destinationJuridicalInterventionId: juridicalId },
                ]
              : []),
          ],
        },
      });
    }
    if (juridicalId) await prisma.juridicalIntervention.deleteMany({ where: { id: juridicalId } });
    if (dispatchId) await prisma.dispatchRecord.deleteMany({ where: { id: dispatchId } });
    if (personId) await prisma.externalPerson.deleteMany({ where: { id: personId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});

test("conserva multiples observaciones con autor, fecha y orden", async () => {
  const suffix = randomUUID();
  const username = `integration-observation-${suffix}`;
  const internalNumber = `IT-OBS-${suffix.slice(0, 12).toUpperCase()}`;
  let userId: string | undefined;
  let dispatchId: string | undefined;
  let observationIds: string[] = [];

  try {
    const user = await prisma.user.create({
      data: {
        name: "Prueba Observaciones",
        username,
        passwordHash: "integration-test-only",
        role: "despacho",
      },
    });
    userId = user.id;

    const dispatch = await prisma.dispatchRecord.create({
      data: {
        internalNumber,
        createdById: user.id,
        description: "Contenido original que debe permanecer inmutable.",
        category: "RECLAMO",
        priority: "MEDIA",
        status: "RECIBIDO",
      },
    });
    dispatchId = dispatch.id;

    const firstAt = new Date("2099-01-01T12:00:00.000Z");
    const secondAt = new Date("2099-01-01T13:00:00.000Z");
    await prisma.legajoObservation.createMany({
      data: [
        {
          module: "DESPACHO",
          entityType: "DispatchRecord",
          entityId: dispatch.id,
          content: "Primera aclaracion.",
          createdById: user.id,
          createdAt: firstAt,
        },
        {
          module: "DESPACHO",
          entityType: "DispatchRecord",
          entityId: dispatch.id,
          content: "Segunda aclaracion.",
          createdById: user.id,
          createdAt: secondAt,
        },
      ],
    });

    const observations = await prisma.legajoObservation.findMany({
      where: {
        module: "DESPACHO",
        entityType: "DispatchRecord",
        entityId: dispatch.id,
      },
      include: { createdBy: true },
      orderBy: { createdAt: "asc" },
    });
    observationIds = observations.map((observation) => observation.id);
    await prisma.attachment.createMany({
      data: [
        {
          module: "DESPACHO",
          entityType: "LegajoObservation",
          entityId: observations[0]!.id,
          fileName: "aclaracion-1.pdf",
          originalName: "Aclaracion 1.pdf",
          objectKey: `integration/${suffix}/aclaracion-1.pdf`,
          mimeType: "application/pdf",
          size: 128,
          uploadedById: user.id,
        },
        {
          module: "DESPACHO",
          entityType: "LegajoObservation",
          entityId: observations[0]!.id,
          fileName: "aclaracion-2.pdf",
          originalName: "Aclaracion 2.pdf",
          objectKey: `integration/${suffix}/aclaracion-2.pdf`,
          mimeType: "application/pdf",
          size: 256,
          uploadedById: user.id,
        },
      ],
    });
    const observationAttachments = await prisma.attachment.findMany({
      where: {
        entityType: "LegajoObservation",
        entityId: observations[0]!.id,
      },
      orderBy: { originalName: "asc" },
    });
    const unchanged = await prisma.dispatchRecord.findUniqueOrThrow({
      where: { id: dispatch.id },
    });

    assert.deepEqual(
      observations.map((observation) => observation.content),
      ["Primera aclaracion.", "Segunda aclaracion."],
    );
    assert.equal(observations[0]?.createdBy.id, user.id);
    assert.equal(observations[0]?.createdAt.getTime(), firstAt.getTime());
    assert.equal(observations[1]?.createdAt.getTime(), secondAt.getTime());
    assert.deepEqual(
      observationAttachments.map((attachment) => attachment.originalName),
      ["Aclaracion 1.pdf", "Aclaracion 2.pdf"],
    );
    assert.equal(
      unchanged.description,
      "Contenido original que debe permanecer inmutable.",
    );
  } finally {
    if (dispatchId) {
      if (observationIds.length) {
        await prisma.attachment.deleteMany({
          where: {
            entityType: "LegajoObservation",
            entityId: { in: observationIds },
          },
        });
      }
      await prisma.legajoObservation.deleteMany({
        where: { entityId: dispatchId },
      });
      await prisma.dispatchRecord.deleteMany({ where: { id: dispatchId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});
