import { notFound } from "next/navigation";
import { JURIDICAL_CONTEXT_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, labelFromValue } from "@/lib/format";
import { parseJuridicalActionContent } from "@/lib/juridical-action-content";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";

type JsonRecord = Record<string, unknown>;

type PdfLine = {
  text: string;
  size?: number;
  bold?: boolean;
  gapBefore?: number;
};

type Sheet = {
  number: number;
  title: string;
  date: Date;
  actor: string;
  role: string;
  type: string;
  description: string;
  guidance?: string | null;
  statusText?: string | null;
  nextStepDescription?: string | null;
  nextStepDate?: Date | null;
  confidentialNotes?: string | null;
  attachments: Array<{ originalName: string; createdAt: Date }>;
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 46;
const bottomMargin = 42;

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function textValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function interventionFromAudit(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.intervention) ?? record;
}

function statusChangeByActionId(logs: Array<{ beforeJson: string | null; afterJson: string | null }>) {
  const changes = new Map<string, { before: string; after: string }>();
  logs.forEach((log) => {
    const afterJson = safeJson(log.afterJson);
    const action = asRecord(asRecord(afterJson)?.action);
    const actionId = textValue(action?.id);
    if (!actionId) return;

    const beforeStatus = textValue(interventionFromAudit(safeJson(log.beforeJson))?.status);
    const afterStatus = textValue(interventionFromAudit(afterJson)?.status);
    if (beforeStatus && afterStatus && beforeStatus !== afterStatus) {
      changes.set(actionId, { before: beforeStatus, after: afterStatus });
    }
  });
  return changes;
}

function initialStatusFromAudit(logs: Array<{ action: string; afterJson: string | null }>, fallback: string) {
  const createLog = logs.find((log) => log.action === "CREATE");
  const createdStatus = textValue(interventionFromAudit(safeJson(createLog?.afterJson ?? null))?.status);
  return createdStatus || fallback;
}

function contextLabel(value: string | null) {
  return value ? JURIDICAL_CONTEXT_LABELS[value] ?? labelFromValue(value) : "-";
}

function display(value: string | null | undefined) {
  return value?.trim() || "-";
}

function asciiText(value: string) {
  return value
    .replace(/→/g, "->")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function escapePdfText(value: string) {
  return asciiText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, size: number) {
  const maxChars = Math.max(36, Math.floor((pageWidth - margin * 2) / (size * 0.48)));
  const paragraphs = asciiText(text).split(/\r?\n/);
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      return;
    }

    let current = "";
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);
  });

  return lines;
}

function buildPdf(lines: PdfLine[]) {
  const pages: Array<Array<{ text: string; size: number; bold: boolean; y: number }>> = [[]];
  let y = pageHeight - margin;

  function newPage() {
    pages.push([]);
    y = pageHeight - margin;
  }

  lines.forEach((line) => {
    const size = line.size ?? 10;
    const lineHeight = size + 4;
    y -= line.gapBefore ?? 0;
    wrapText(line.text, size).forEach((wrappedLine) => {
      if (y < bottomMargin) newPage();
      pages[pages.length - 1].push({
        text: wrappedLine,
        size,
        bold: Boolean(line.bold),
        y,
      });
      y -= lineHeight;
    });
  });

  const pageObjects = pages.map((page) =>
    page
      .map((line) => `BT /F${line.bold ? 2 : 1} ${line.size} Tf 1 0 0 1 ${margin} ${line.y.toFixed(2)} Tm (${escapePdfText(line.text)}) Tj ET`)
      .join("\n"),
  );

  const objects: string[] = [];
  const fontStart = 3 + pages.length * 2;
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] >>`;

  pageObjects.forEach((content, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontStart} 0 R /F2 ${fontStart + 1} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] = `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
  });

  objects[fontStart] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[fontStart + 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(chunks.join(""));
    chunks.push(`${index} 0 obj\n${objects[index]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""));
  chunks.push(`xref\n0 ${objects.length}\n0000000000 65535 f \n`);
  for (let index = 1; index < objects.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(chunks.join(""));
}

function pushField(lines: PdfLine[], label: string, value: string | null | undefined) {
  lines.push({ text: `${label}: ${display(value)}` });
}

function pushSheet(lines: PdfLine[], sheet: Sheet) {
  lines.push({ text: `Hoja ${sheet.number} - ${sheet.title}`, size: 14, bold: true, gapBefore: 14 });
  lines.push({ text: `Fecha y hora: ${formatDateTime(sheet.date)}` });
  lines.push({ text: `Registrado por: ${sheet.actor} (${labelFromValue(sheet.role)})` });
  lines.push({ text: `Tipo: ${labelFromValue(sheet.type)}` });
  if (sheet.statusText) lines.push({ text: sheet.statusText });
  if (sheet.nextStepDate) lines.push({ text: `Fecha de seguimiento: ${formatDate(sheet.nextStepDate)}` });
  if (sheet.description) {
    lines.push({ text: "Descripcion / relato", bold: true, gapBefore: 8 });
    lines.push({ text: sheet.description });
  }
  if (sheet.guidance) {
    lines.push({ text: "Intervencion realizada / orientacion brindada", bold: true, gapBefore: 8 });
    lines.push({ text: sheet.guidance });
  }
  if (sheet.nextStepDescription) {
    lines.push({ text: "Proxima accion", bold: true, gapBefore: 8 });
    lines.push({ text: sheet.nextStepDescription });
  }
  if (sheet.confidentialNotes) {
    lines.push({ text: "Notas internas confidenciales", bold: true, gapBefore: 8 });
    lines.push({ text: sheet.confidentialNotes });
  }
  if (sheet.attachments.length) {
    lines.push({ text: "Adjuntos de esta hoja", bold: true, gapBefore: 8 });
    sheet.attachments.forEach((attachment) => {
      lines.push({ text: `- ${attachment.originalName} (${formatDateTime(attachment.createdAt)})` });
    });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      destinationReferrals: { include: { referredBy: true }, orderBy: { referredAt: "asc" } },
      originReferrals: { include: { referredBy: true }, orderBy: { referredAt: "asc" } },
    },
  });
  if (!intervention) notFound();

  const actionIds = intervention.actions.map((action) => action.id);
  const [attachments, auditLogs] = await Promise.all([
    prisma.attachment.findMany({
      where: {
        module: "JURIDICO",
        OR: [
          { entityType: "JuridicalIntervention", entityId: intervention.id },
          ...(actionIds.length ? [{ entityType: "JuridicalAction", entityId: { in: actionIds } }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "JuridicalIntervention", entityId: id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const statusChanges = statusChangeByActionId(auditLogs);
  const attachmentsByActionId = new Map<string, Array<{ originalName: string; createdAt: Date }>>();
  attachments
    .filter((attachment) => attachment.entityType === "JuridicalAction")
    .forEach((attachment) => {
      const current = attachmentsByActionId.get(attachment.entityId) ?? [];
      current.push({ originalName: attachment.originalName, createdAt: attachment.createdAt });
      attachmentsByActionId.set(attachment.entityId, current);
    });

  const visibleActions = intervention.actions.filter((action) => !(action.actionType === "DERIVACION" && action.content.startsWith("Derivacion a Despacho:")));
  const sheets: Sheet[] = [
    {
      number: 1,
      title: "Primera atencion",
      date: intervention.attendedAt,
      actor: intervention.createdBy.name,
      role: intervention.createdBy.role,
      type: intervention.type,
      description: intervention.description,
      guidance: intervention.guidanceProvided,
      statusText: `Estado inicial: ${labelFromValue(initialStatusFromAudit(auditLogs, intervention.status))}`,
      confidentialNotes: intervention.confidentialNotes,
      attachments: [],
    },
    ...visibleActions.map((action, index) => {
      const parsed = parseJuridicalActionContent(action.content);
      const statusChange = statusChanges.get(action.id);
      return {
        number: index + 2,
        title: labelFromValue(action.actionType),
        date: action.createdAt,
        actor: action.createdBy.name,
        role: action.createdBy.role,
        type: action.actionType,
        description: parsed.description,
        guidance: parsed.guidanceProvided,
        statusText: statusChange ? `Estado: ${labelFromValue(statusChange.before)} -> ${labelFromValue(statusChange.after)}` : null,
        nextStepDescription: parsed.nextStepDescription,
        nextStepDate: action.nextStepDate,
        attachments: attachmentsByActionId.get(action.id) ?? [],
      };
    }),
  ];

  const requestedSheet = Number(new URL(request.url).searchParams.get("hoja") ?? 0);
  const selectedSheets = requestedSheet ? sheets.filter((sheet) => sheet.number === requestedSheet) : sheets;
  if (requestedSheet && !selectedSheets.length) notFound();

  const complainants = intervention.complainants.length
    ? intervention.complainants
    : intervention.complainantIsAnonymous || intervention.complainantDni || intervention.complainantFirstName || intervention.complainantLastName
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
  const linkedPersons = intervention.linkedPersons.length
    ? intervention.linkedPersons
    : intervention.person || intervention.dniSnapshot || intervention.nameSnapshot
      ? [
          {
            dni: intervention.person?.dni ?? intervention.dniSnapshot,
            firstName: intervention.person?.firstName ?? null,
            apellidoApodoManual: intervention.person?.lastName ?? intervention.nameSnapshot,
            phone1: intervention.person?.phone1 ?? null,
            address: intervention.person?.address ?? null,
          },
        ]
      : [];

  const generalAttachments = attachments.filter((attachment) => attachment.entityType === "JuridicalIntervention");
  const referrals = [...intervention.destinationReferrals, ...intervention.originReferrals].sort((a, b) => a.referredAt.getTime() - b.referredAt.getTime());
  const lines: PdfLine[] = [
    { text: "Secretaria de Seguridad", size: 11, bold: true },
    {
      text: requestedSheet ? `Hoja ${requestedSheet} del legajo ${intervention.internalNumber}` : `Legajo de la intervencion ${intervention.internalNumber}`,
      size: 18,
      bold: true,
      gapBefore: 6,
    },
    { text: `Generado: ${formatDateTime(new Date())}`, size: 9 },
  ];

  if (!requestedSheet) {
    lines.push({ text: "Datos generales", size: 13, bold: true, gapBefore: 16 });
    pushField(lines, "Estado actual", labelFromValue(intervention.status));
    pushField(lines, "Urgencia", labelFromValue(intervention.urgency));
    pushField(lines, "Tipo", labelFromValue(intervention.type));
    pushField(lines, "Contexto", contextLabel(intervention.interventionContext));
    pushField(lines, "Oficio", intervention.oficioNumber);
    pushField(lines, "Expediente / legajo", intervention.expedienteNumber);
    pushField(lines, "Area derivada", intervention.derivedArea);
    pushField(lines, "Fecha inicial", formatDateTime(intervention.attendedAt));
    pushField(lines, "Carga en sistema", formatDateTime(intervention.createdAt));
    pushField(lines, "Usuario que inicio", intervention.createdBy.name);
    pushField(lines, "Origen", labelFromValue(intervention.origin));

    lines.push({ text: "Personas vinculadas", size: 13, bold: true, gapBefore: 16 });
    if (complainants.length) {
      complainants.forEach((person, index) => {
        const name = person.isAnonymous ? "Denunciante anonimo" : [person.firstName, person.lastName].filter(Boolean).join(" ");
        lines.push({ text: `Solicitante ${index + 1}: ${display(name)} - DNI ${display(person.dni)} - Tel. ${display(person.phone1)} - Dom. ${display(person.address)}` });
      });
    } else {
      lines.push({ text: "Solicitante / denunciante: sin datos cargados" });
    }
    if (linkedPersons.length) {
      linkedPersons.forEach((person, index) => {
        const name = [person.firstName, person.apellidoApodoManual].filter(Boolean).join(" ");
        lines.push({ text: `Persona vinculada ${index + 1}: ${display(name)} - DNI ${display(person.dni)} - Tel. ${display(person.phone1)} - Dom. ${display(person.address)}` });
      });
    } else {
      lines.push({ text: "Persona vinculada / denunciada: sin datos cargados" });
    }

    if (generalAttachments.length) {
      lines.push({ text: "Adjuntos privados generales", size: 13, bold: true, gapBefore: 16 });
      generalAttachments.forEach((attachment) => lines.push({ text: `- ${attachment.originalName} (${formatDateTime(attachment.createdAt)})` }));
    }

    if (referrals.length) {
      lines.push({ text: "Derivaciones", size: 13, bold: true, gapBefore: 16 });
      referrals.forEach((referral) => {
        lines.push({ text: `${referral.originModule} -> ${referral.destinationModule}: ${referral.summary} (${formatDateTime(referral.referredAt)})` });
      });
    }
  }

  lines.push({ text: requestedSheet ? "Registro documental" : "Hojas del legajo", size: 13, bold: true, gapBefore: 16 });
  selectedSheets.forEach((sheet) => pushSheet(lines, sheet));
  lines.push({ text: "Documento generado por el sistema de la Secretaria de Seguridad.", size: 9, gapBefore: 18 });

  const pdf = buildPdf(lines);
  const filename = requestedSheet ? `hoja-${requestedSheet}-${intervention.internalNumber}.pdf` : `legajo-${intervention.internalNumber}.pdf`;

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
