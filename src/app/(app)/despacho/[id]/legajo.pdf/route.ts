import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { parseJuridicalActionContent } from "@/lib/juridical-action-content";
import { renderLegajoPdf, type LegajoPdfPerson, type LegajoPdfReferral, type LegajoPdfSheet } from "@/lib/legajo-pdf";
import { prisma } from "@/lib/prisma";
import { earliestDate, isVisibleBeforeReferralCutoff } from "@/lib/referral-privacy";
import { assertAccess, canAccessDispatch } from "@/lib/rbac";
import { personDisplayName } from "@/lib/text";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAccess(canAccessDispatch(user));
  const { id } = await params;

  const record = await prisma.dispatchRecord.findUnique({
    where: { id },
    include: {
      createdBy: true,
      complainants: { orderBy: { sortOrder: "asc" } },
      linkedPersons: { orderBy: { sortOrder: "asc" } },
      followUps: { include: { createdBy: true }, orderBy: { createdAt: "asc" } },
      destinationReferrals: { include: { referredBy: true }, orderBy: { referredAt: "asc" } },
      originReferrals: { include: { referredBy: true }, orderBy: { referredAt: "asc" } },
    },
  });

  if (!record) notFound();

  const isDerivationFollowUp = (followUp: { content: string; statusAfter: string | null }) =>
    followUp.statusAfter === "DERIVADO" || followUp.content.toLocaleLowerCase("es-AR").startsWith("deriv");
  const outgoingReferralAt = earliestDate(record.originReferrals.map((referral) => referral.referredAt));
  const derivationFollowUpAt = earliestDate(record.followUps.filter(isDerivationFollowUp).map((followUp) => followUp.createdAt));
  const privacyCutoffAt = earliestDate([outgoingReferralAt, derivationFollowUpAt]);
  const visibleFollowUps = record.followUps.filter((followUp) =>
    isVisibleBeforeReferralCutoff(followUp, privacyCutoffAt, isDerivationFollowUp),
  );
  const followUpIds = visibleFollowUps.map((followUp) => followUp.id);
  const [attachments, observations] = await Promise.all([
    prisma.attachment.findMany({
      where: {
        module: "DESPACHO",
        OR: [
          { entityType: "DispatchRecord", entityId: record.id },
          ...(followUpIds.length ? [{ entityType: "DispatchFollowUp", entityId: { in: followUpIds } }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.legajoObservation.findMany({
      where: {
        module: "DESPACHO",
        ...(privacyCutoffAt ? { createdAt: { lte: privacyCutoffAt } } : {}),
        OR: [
          { entityType: "DispatchRecord", entityId: record.id },
          ...(followUpIds.length ? [{ entityType: "DispatchFollowUp", entityId: { in: followUpIds } }] : []),
        ],
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const observationAttachments = observations.length
    ? await prisma.attachment.findMany({
        where: {
          module: "DESPACHO",
          entityType: "LegajoObservation",
          entityId: { in: observations.map((observation) => observation.id) },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const attachmentsByObservationId = new Map<
    string,
    Array<{ originalName: string; createdAt: Date }>
  >();
  observationAttachments.forEach((attachment) => {
    const current = attachmentsByObservationId.get(attachment.entityId) ?? [];
    current.push({
      originalName: attachment.originalName,
      createdAt: attachment.createdAt,
    });
    attachmentsByObservationId.set(attachment.entityId, current);
  });

  const attachmentsByFollowUpId = new Map<string, Array<{ originalName: string; createdAt: Date }>>();
  attachments
    .filter((attachment) => attachment.entityType === "DispatchFollowUp")
    .forEach((attachment) => {
      const current = attachmentsByFollowUpId.get(attachment.entityId) ?? [];
      current.push({ originalName: attachment.originalName, createdAt: attachment.createdAt });
      attachmentsByFollowUpId.set(attachment.entityId, current);
    });
  const observationsByTarget = new Map<string, Array<{ content: string; createdAt: Date; createdBy: string; attachments: Array<{ originalName: string; createdAt: Date }> }>>();
  observations.forEach((observation) => {
    const key = `${observation.entityType}:${observation.entityId}`;
    const current = observationsByTarget.get(key) ?? [];
    current.push({
      content: observation.content,
      createdAt: observation.createdAt,
      createdBy: observation.createdBy.name,
      attachments: attachmentsByObservationId.get(observation.id) ?? [],
    });
    observationsByTarget.set(key, current);
  });

  const complainants: LegajoPdfPerson[] = record.complainants.map((person) => ({
    name: person.isAnonymous ? "Denunciante anonimo" : personDisplayName(person.lastName, person.firstName),
    dni: person.dni,
    phone: person.phone1,
    address: person.address,
  }));

  const linkedPersons: LegajoPdfPerson[] = record.linkedPersons.map((person) => ({
    name: personDisplayName(person.apellidoApodoManual, person.firstName),
    dni: person.dni,
    phone: person.phone1,
    address: person.address,
  }));

  const generalAttachments = attachments
    .filter((attachment) => attachment.entityType === "DispatchRecord")
    .map((attachment) => ({ originalName: attachment.originalName, createdAt: attachment.createdAt }));

  const referrals: LegajoPdfReferral[] = [...record.destinationReferrals, ...record.originReferrals]
    .sort((a, b) => a.referredAt.getTime() - b.referredAt.getTime())
    .map((referral) => ({
      origin: referral.originModule,
      destination: referral.destinationModule,
      summary: referral.summary,
      referredAt: referral.referredAt,
      status: referral.status,
    }));

  const sheets: LegajoPdfSheet[] = [
    {
      number: 1,
      date: record.attendedAt,
      actor: record.createdBy.name,
      role: record.createdBy.role,
      type: record.category,
      description: record.description,
      guidance: record.initialGuidance,
      statusText: `Estado actual: ${labelFromValue(record.status)}`,
      attachments: [],
      observations: observationsByTarget.get(`DispatchRecord:${record.id}`) ?? [],
    },
    ...visibleFollowUps.map((followUp, index) => {
      const parsed = parseJuridicalActionContent(followUp.content);
      return {
        number: index + 2,
        date: followUp.createdAt,
        actor: followUp.createdBy.name,
        role: followUp.createdBy.role,
        type: followUp.statusAfter ?? "SEGUIMIENTO",
        description: parsed.description || followUp.content,
        guidance: parsed.guidanceProvided,
        statusText: followUp.statusAfter ? `Estado posterior: ${labelFromValue(followUp.statusAfter)}` : null,
        nextStepDescription: parsed.nextStepDescription,
        attachments: attachmentsByFollowUpId.get(followUp.id) ?? [],
        observations: observationsByTarget.get(`DispatchFollowUp:${followUp.id}`) ?? [],
      };
    }),
  ];

  const pdf = await renderLegajoPdf({
    title: `Legajo: ${record.internalNumber}`,
    requestedSheet: null,
    generatedAt: new Date(),
    createdAt: record.createdAt,
    createdByName: record.createdBy.name,
    generalFields: [
      { label: "Estado actual", value: labelFromValue(record.status) },
      { label: "Prioridad", value: labelFromValue(record.priority) },
      { label: "Categoria", value: labelFromValue(record.category) },
      { label: "Fecha de atencion", value: formatDateTime(record.attendedAt) },
      { label: "Area derivada", value: record.referredArea },
    ],
    complainants,
    linkedPersons,
    generalAttachments,
    referrals,
    sheets,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `inline; filename="legajo-${record.internalNumber}.pdf"`,
    },
  });
}
