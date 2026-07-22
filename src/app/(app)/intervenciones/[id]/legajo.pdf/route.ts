import { notFound } from "next/navigation";
import { JURIDICAL_CONTEXT_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { parseJuridicalActionContentForDisplay } from "@/lib/juridical-action-content";
import {
  renderLegajoPdf,
  type LegajoPdfPerson,
  type LegajoPdfReferral,
  type LegajoPdfSheet,
} from "@/lib/legajo-pdf";
import { prisma } from "@/lib/prisma";
import {
  earliestDate,
  isVisibleBeforeReferralCutoff,
} from "@/lib/referral-privacy";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";
import { personDisplayName } from "@/lib/text";

type JsonRecord = Record<string, unknown>;

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function textValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

function interventionFromAudit(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.intervention) ?? record;
}

function statusChangeByActionId(
  logs: Array<{ beforeJson: string | null; afterJson: string | null }>,
) {
  const changes = new Map<string, { before: string; after: string }>();
  logs.forEach((log) => {
    const afterJson = safeJson(log.afterJson);
    const action = asRecord(asRecord(afterJson)?.action);
    const actionId = textValue(action?.id);
    if (!actionId) return;

    const beforeStatus = textValue(
      interventionFromAudit(safeJson(log.beforeJson))?.status,
    );
    const afterStatus = textValue(interventionFromAudit(afterJson)?.status);
    if (beforeStatus && afterStatus && beforeStatus !== afterStatus) {
      changes.set(actionId, { before: beforeStatus, after: afterStatus });
    }
  });
  return changes;
}

function initialStatusFromAudit(
  logs: Array<{ action: string; afterJson: string | null }>,
  fallback: string,
) {
  const createLog = logs.find((log) => log.action === "CREATE");
  const createdStatus = textValue(
    interventionFromAudit(safeJson(createLog?.afterJson ?? null))?.status,
  );
  return createdStatus || fallback;
}

function contextLabel(value: string | null) {
  return value
    ? (JURIDICAL_CONTEXT_LABELS[value] ?? labelFromValue(value))
    : "-";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  assertAccess(canAccessJuridical(user));
  const { id } = await params;

  const intervention = await prisma.juridicalIntervention.findUnique({
    where: { id },
    include: {
      person: true,
      complainants: { orderBy: { sortOrder: "asc" } },
      linkedPersons: { orderBy: { sortOrder: "asc" } },
      createdBy: true,
      actions: { include: { createdBy: true }, orderBy: { createdAt: "asc" } },
      destinationReferrals: {
        include: { referredBy: true },
        orderBy: { referredAt: "asc" },
      },
      originReferrals: {
        include: { referredBy: true },
        orderBy: { referredAt: "asc" },
      },
    },
  });
  if (!intervention) notFound();

  const isDerivationAction = (action: { actionType: string }) =>
    action.actionType === "DERIVACION";
  const outgoingReferralAt = earliestDate(
    intervention.originReferrals.map((referral) => referral.referredAt),
  );
  const derivationActionAt = earliestDate(
    intervention.actions
      .filter(isDerivationAction)
      .map((action) => action.createdAt),
  );
  const privacyCutoffAt = earliestDate([
    outgoingReferralAt,
    derivationActionAt,
  ]);
  const visibleActions = intervention.actions.filter((action) =>
    isVisibleBeforeReferralCutoff(action, privacyCutoffAt, isDerivationAction),
  );
  const actionIds = visibleActions.map((action) => action.id);
  const [attachments, auditLogs, observations] = await Promise.all([
    prisma.attachment.findMany({
      where: {
        module: "JURIDICO",
        OR: [
          { entityType: "JuridicalIntervention", entityId: intervention.id },
          ...(actionIds.length
            ? [{ entityType: "JuridicalAction", entityId: { in: actionIds } }]
            : []),
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "JuridicalIntervention", entityId: id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.legajoObservation.findMany({
      where: {
        module: "JURIDICO",
        ...(privacyCutoffAt ? { createdAt: { lte: privacyCutoffAt } } : {}),
        OR: [
          { entityType: "JuridicalIntervention", entityId: intervention.id },
          ...(actionIds.length
            ? [{ entityType: "JuridicalAction", entityId: { in: actionIds } }]
            : []),
        ],
      },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const observationAttachments = observations.length
    ? await prisma.attachment.findMany({
        where: {
          module: "JURIDICO",
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

  const statusChanges = statusChangeByActionId(auditLogs);
  const attachmentsByActionId = new Map<
    string,
    Array<{ originalName: string; createdAt: Date }>
  >();
  attachments
    .filter((attachment) => attachment.entityType === "JuridicalAction")
    .forEach((attachment) => {
      const current = attachmentsByActionId.get(attachment.entityId) ?? [];
      current.push({
        originalName: attachment.originalName,
        createdAt: attachment.createdAt,
      });
      attachmentsByActionId.set(attachment.entityId, current);
    });
  const observationsByTarget = new Map<
    string,
    Array<{
      content: string;
      createdAt: Date;
      createdBy: string;
      attachments: Array<{ originalName: string; createdAt: Date }>;
    }>
  >();
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

  const sheets: LegajoPdfSheet[] = [
    {
      number: 1,
      date: intervention.attendedAt,
      actor: intervention.createdBy.name,
      role: intervention.createdBy.role,
      type: intervention.type,
      description: intervention.description,
      guidance: intervention.guidanceProvided,
      statusText: `Estado inicial: ${labelFromValue(initialStatusFromAudit(auditLogs, intervention.status))}`,
      attachments: [],
      observations:
        observationsByTarget.get(
          `JuridicalIntervention:${intervention.id}`,
        ) ?? [],
    },
    ...visibleActions.map((action, index) => {
      const parsed = parseJuridicalActionContentForDisplay(
        action.content,
        action.actionType,
      );
      const statusChange = statusChanges.get(action.id);
      return {
        number: index + 2,
        date: action.createdAt,
        actor: action.createdBy.name,
        role: action.createdBy.role,
        type: action.actionType,
        description: parsed.description,
        guidance: parsed.guidanceProvided,
        statusText: statusChange
          ? `Estado: ${labelFromValue(statusChange.before)} -> ${labelFromValue(statusChange.after)}`
          : null,
        nextStepDescription: parsed.nextStepDescription,
        nextStepDate: action.nextStepDate,
        attachments: attachmentsByActionId.get(action.id) ?? [],
        observations:
          observationsByTarget.get(`JuridicalAction:${action.id}`) ?? [],
      };
    }),
  ];

  const requestedSheetRaw = Number(
    new URL(request.url).searchParams.get("hoja") ?? 0,
  );
  const requestedSheet =
    Number.isFinite(requestedSheetRaw) && requestedSheetRaw > 0
      ? requestedSheetRaw
      : null;
  const selectedSheets = requestedSheet
    ? sheets.filter((sheet) => sheet.number === requestedSheet)
    : sheets;
  if (requestedSheet && !selectedSheets.length) notFound();

  const complainantsSource = intervention.complainants.length
    ? intervention.complainants
    : intervention.complainantIsAnonymous ||
        intervention.complainantDni ||
        intervention.complainantFirstName ||
        intervention.complainantLastName
      ? [
          {
            isAnonymous: intervention.complainantIsAnonymous,
            dni: intervention.complainantDni,
            firstName: intervention.complainantFirstName,
            lastName: intervention.complainantLastName,
            phone1: intervention.complainantPhone1,
            address: intervention.complainantAddress,
          },
        ]
      : [];
  const linkedSource = intervention.linkedPersons.length
    ? intervention.linkedPersons
    : intervention.person ||
        intervention.dniSnapshot ||
        intervention.nameSnapshot
      ? [
          {
            dni: intervention.person?.dni ?? intervention.dniSnapshot,
            firstName: intervention.person?.firstName ?? null,
            apellidoApodoManual:
              intervention.person?.lastName ?? intervention.nameSnapshot,
            phone1: intervention.person?.phone1 ?? null,
            address: intervention.person?.address ?? null,
          },
        ]
      : [];

  const complainants: LegajoPdfPerson[] = complainantsSource.map((person) => ({
    name: person.isAnonymous
      ? "Denunciante anonimo"
      : personDisplayName(person.lastName, person.firstName),
    dni: person.dni,
    phone: person.phone1,
    address: person.address,
  }));
  const linkedPersons: LegajoPdfPerson[] = linkedSource.map((person) => ({
    name: personDisplayName(person.apellidoApodoManual, person.firstName),
    dni: person.dni,
    phone: person.phone1,
    address: person.address,
  }));

  const generalAttachments = attachments
    .filter((attachment) => attachment.entityType === "JuridicalIntervention")
    .map((attachment) => ({
      originalName: attachment.originalName,
      createdAt: attachment.createdAt,
    }));
  const referrals: LegajoPdfReferral[] = [
    ...intervention.destinationReferrals,
    ...intervention.originReferrals,
  ]
    .sort((a, b) => a.referredAt.getTime() - b.referredAt.getTime())
    .map((referral) => ({
      origin: referral.originModule,
      destination: referral.destinationModule,
      summary: referral.summary,
      referredAt: referral.referredAt,
      status: referral.status,
    }));

  const pdf = await renderLegajoPdf({
    title: `Legajo ${intervention.internalNumber}`,
    requestedSheet,
    generatedAt: new Date(),
    createdAt: intervention.createdAt,
    createdByName: intervention.createdBy.name,
    generalFields: requestedSheet
      ? null
      : [
          {
            label: "Estado actual",
            value: labelFromValue(intervention.status),
          },
          { label: "Urgencia", value: labelFromValue(intervention.urgency) },
          { label: "Tipo", value: labelFromValue(intervention.type) },
          {
            label: "Contexto",
            value: contextLabel(intervention.interventionContext),
          },
          {
            label: "Fecha inicial",
            value: formatDateTime(intervention.attendedAt),
          },
          { label: "Oficio", value: intervention.oficioNumber },
          {
            label: "Expediente / legajo",
            value: intervention.expedienteNumber,
          },
          { label: "Area derivada", value: intervention.derivedArea },
        ],
    complainants: requestedSheet ? null : complainants,
    linkedPersons: requestedSheet ? null : linkedPersons,
    generalAttachments: requestedSheet ? null : generalAttachments,
    referrals: requestedSheet ? null : referrals,
    sheets: selectedSheets,
  });

  const filename = requestedSheet
    ? `hoja-${requestedSheet}-${intervention.internalNumber}.pdf`
    : `legajo-${intervention.internalNumber}.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
