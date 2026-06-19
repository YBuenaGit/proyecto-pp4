import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { JURIDICAL_CONTEXT_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, labelFromValue } from "@/lib/format";
import { parseJuridicalActionContent } from "@/lib/juridical-action-content";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessJuridical } from "@/lib/rbac";

type JsonRecord = Record<string, unknown>;

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

type PersonLine = { name: string; dni?: string | null; phone?: string | null; address?: string | null };

type LegajoGeneral = {
  status: string;
  urgency: string;
  type: string;
  context: string;
  oficio?: string | null;
  expediente?: string | null;
  derivedArea?: string | null;
  attendedAt: Date;
  createdAt: Date;
  createdByName: string;
  origin: string;
  complainants: PersonLine[];
  linkedPersons: PersonLine[];
  generalAttachments: Array<{ originalName: string; createdAt: Date }>;
  referrals: Array<{ origin: string; destination: string; summary: string; referredAt: Date }>;
};

type LegajoPdfInput = {
  legajoNumber: string;
  requestedSheet: number | null;
  generatedAt: Date;
  general: LegajoGeneral | null;
  sheets: Sheet[];
};

// ---------- Layout ----------
const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = 48;
const BOTTOM = 54;
const CONTENT_W = PAGE.w - MARGIN * 2;

const COLORS = {
  brand: rgb(0.043, 0.165, 0.333),
  accent: rgb(0.024, 0.404, 0.69),
  ink: rgb(0.129, 0.145, 0.161),
  muted: rgb(0.424, 0.459, 0.49),
  line: rgb(0.78, 0.824, 0.871),
  soft: rgb(0.84, 0.9, 0.96),
  white: rgb(1, 1, 1),
};

const ORDINAL_WORDS = ["", "Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta", "Septima", "Octava", "Novena", "Decima", "Undecima", "Duodecima"];

function attentionLabel(position: number) {
  const word = ORDINAL_WORDS[position];
  return word ? `${word} atencion` : `Atencion ${position}`;
}

// ---------- Audit / parsing helpers ----------
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
    .replace(/\t/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

// ---------- PDF drawing context ----------
type Ctx = {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  logo?: PDFImage;
  legajoNumber: string;
  page: PDFPage;
  y: number;
  pageNo: number;
};

function drawHeader(ctx: Ctx) {
  const top = PAGE.h - MARGIN;
  const logoSize = 36;

  if (ctx.logo) {
    ctx.page.drawImage(ctx.logo, { x: MARGIN, y: top - logoSize, width: logoSize, height: logoSize });
  }

  const textX = MARGIN + logoSize + 12;
  ctx.page.drawText("SECRETARIA DE SEGURIDAD MUNICIPAL", { x: textX, y: top - 13, size: 10.5, font: ctx.bold, color: COLORS.brand });
  ctx.page.drawText("Expediente virtual - Legajo de intervencion", { x: textX, y: top - 26, size: 8.5, font: ctx.font, color: COLORS.muted });

  const legajo = `Legajo ${ctx.legajoNumber}`;
  const legajoW = ctx.bold.widthOfTextAtSize(legajo, 9.5);
  ctx.page.drawText(legajo, { x: PAGE.w - MARGIN - legajoW, y: top - 13, size: 9.5, font: ctx.bold, color: COLORS.ink });
  const pageLabel = `Pagina ${ctx.pageNo}`;
  const pageW = ctx.font.widthOfTextAtSize(pageLabel, 8);
  ctx.page.drawText(pageLabel, { x: PAGE.w - MARGIN - pageW, y: top - 26, size: 8, font: ctx.font, color: COLORS.muted });

  const ruleY = top - logoSize - 6;
  ctx.page.drawRectangle({ x: MARGIN, y: ruleY, width: CONTENT_W, height: 1.4, color: COLORS.brand });
  ctx.y = ruleY - 24;
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
  ctx.pageNo += 1;
  drawHeader(ctx);
}

function ensure(ctx: Ctx, space: number) {
  if (ctx.y - space < BOTTOM) newPage(ctx);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const out: string[] = [];
  asciiText(text)
    .split(/\r?\n/)
    .forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        out.push("");
        return;
      }
      let line = "";
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
          out.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      if (line) out.push(line);
    });
  return out;
}

function paragraph(
  ctx: Ctx,
  text: string,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gapBefore?: number; indent?: number } = {},
) {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.bold : ctx.font;
  const color = opts.color ?? COLORS.ink;
  const indent = opts.indent ?? 0;
  const lineHeight = size + 4;
  if (opts.gapBefore) ctx.y -= opts.gapBefore;
  wrapText(text, font, size, CONTENT_W - indent).forEach((line) => {
    ensure(ctx, lineHeight);
    if (line) ctx.page.drawText(line, { x: MARGIN + indent, y: ctx.y, size, font, color });
    ctx.y -= lineHeight;
  });
}

function sectionTitle(ctx: Ctx, text: string) {
  ctx.y -= 16;
  ensure(ctx, 24);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 2, width: 4, height: 14, color: COLORS.accent });
  ctx.page.drawText(asciiText(text), { x: MARGIN + 12, y: ctx.y, size: 12.5, font: ctx.bold, color: COLORS.brand });
  ctx.y -= 12;
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y, width: CONTENT_W, height: 0.8, color: COLORS.line });
  ctx.y -= 14;
}

function field(ctx: Ctx, label: string, value: string | null | undefined) {
  const size = 10;
  const lineHeight = size + 5;
  const labelText = `${asciiText(label)}:  `;
  const labelWidth = ctx.bold.widthOfTextAtSize(labelText, size);
  const valueLines = wrapText(display(value), ctx.font, size, CONTENT_W - labelWidth);
  ensure(ctx, lineHeight);
  ctx.page.drawText(labelText, { x: MARGIN, y: ctx.y, size, font: ctx.bold, color: COLORS.brand });
  valueLines.forEach((line, index) => {
    if (index > 0) {
      ctx.y -= lineHeight;
      ensure(ctx, lineHeight);
    }
    if (line) ctx.page.drawText(line, { x: MARGIN + labelWidth, y: ctx.y, size, font: ctx.font, color: COLORS.ink });
  });
  ctx.y -= lineHeight + 1;
}

function sheetBand(ctx: Ctx, ordinal: string, subtitle: string) {
  ctx.y -= 18;
  const height = 46;
  ensure(ctx, height + 14);
  const top = ctx.y;
  const bottom = top - height;
  ctx.page.drawRectangle({ x: MARGIN, y: bottom, width: CONTENT_W, height, color: COLORS.brand });
  ctx.page.drawRectangle({ x: MARGIN, y: bottom, width: 5, height, color: COLORS.accent });
  ctx.page.drawText(asciiText(ordinal), { x: MARGIN + 18, y: top - 21, size: 16, font: ctx.bold, color: COLORS.white });
  if (subtitle) ctx.page.drawText(asciiText(subtitle), { x: MARGIN + 18, y: top - 37, size: 9.5, font: ctx.font, color: COLORS.soft });
  ctx.y = bottom - 16;
}

function heroBlock(ctx: Ctx, title: string, subtitle: string) {
  ctx.y -= 4;
  paragraph(ctx, "LEGAJO DE INTERVENCION", { size: 9, bold: true, color: COLORS.accent });
  paragraph(ctx, title, { size: 22, bold: true, color: COLORS.brand, gapBefore: 2 });
  paragraph(ctx, subtitle, { size: 9, color: COLORS.muted, gapBefore: 2 });
}

function personLine(person: PersonLine) {
  return `${display(person.name)} - DNI ${display(person.dni)} - Tel. ${display(person.phone)} - Dom. ${display(person.address)}`;
}

async function loadLogo(doc: PDFDocument): Promise<PDFImage | undefined> {
  try {
    const bytes = await readFile(join(process.cwd(), "public", "logo-gum1.png"));
    return await doc.embedPng(bytes);
  } catch {
    return undefined;
  }
}

export async function renderLegajoPdf(input: LegajoPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Legajo ${input.legajoNumber}`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(doc);

  const ctx: Ctx = {
    doc,
    font,
    bold,
    logo,
    legajoNumber: input.legajoNumber,
    page: doc.addPage([PAGE.w, PAGE.h]),
    y: 0,
    pageNo: 1,
  };
  drawHeader(ctx);

  const heroTitle = input.requestedSheet ? `Hoja ${input.requestedSheet} - Legajo ${input.legajoNumber}` : `Legajo ${input.legajoNumber}`;
  heroBlock(ctx, heroTitle, `Generado: ${formatDateTime(input.generatedAt)}`);

  if (input.general) {
    const g = input.general;
    sectionTitle(ctx, "Datos generales");
    field(ctx, "Estado actual", labelFromValue(g.status));
    field(ctx, "Urgencia", labelFromValue(g.urgency));
    field(ctx, "Tipo", labelFromValue(g.type));
    field(ctx, "Contexto", g.context);
    field(ctx, "Oficio", g.oficio);
    field(ctx, "Expediente / legajo", g.expediente);
    field(ctx, "Area derivada", g.derivedArea);
    field(ctx, "Fecha inicial", formatDateTime(g.attendedAt));
    field(ctx, "Carga en sistema", formatDateTime(g.createdAt));
    field(ctx, "Usuario que inicio", g.createdByName);
    field(ctx, "Origen", labelFromValue(g.origin));

    sectionTitle(ctx, "Personas vinculadas");
    if (g.complainants.length) {
      g.complainants.forEach((person, index) => field(ctx, `Solicitante ${index + 1}`, personLine(person)));
    } else {
      paragraph(ctx, "Solicitante / denunciante: sin datos cargados", { color: COLORS.muted });
    }
    if (g.linkedPersons.length) {
      g.linkedPersons.forEach((person, index) => field(ctx, `Persona vinculada ${index + 1}`, personLine(person)));
    } else {
      paragraph(ctx, "Persona vinculada / denunciada: sin datos cargados", { color: COLORS.muted });
    }

    if (g.generalAttachments.length) {
      sectionTitle(ctx, "Adjuntos privados generales");
      g.generalAttachments.forEach((attachment) => paragraph(ctx, `- ${attachment.originalName} (${formatDateTime(attachment.createdAt)})`, { indent: 6 }));
    }

    if (g.referrals.length) {
      sectionTitle(ctx, "Derivaciones");
      g.referrals.forEach((referral) =>
        paragraph(ctx, `${referral.origin} -> ${referral.destination}: ${referral.summary} (${formatDateTime(referral.referredAt)})`, { indent: 6 }),
      );
    }
  }

  if (!input.requestedSheet) {
    sectionTitle(ctx, "Registro documental del legajo");
  }

  input.sheets.forEach((sheet) => {
    sheetBand(ctx, attentionLabel(sheet.number), labelFromValue(sheet.type));
    const meta = [`${formatDateTime(sheet.date)}`, `Registrado por: ${sheet.actor} (${labelFromValue(sheet.role)})`];
    paragraph(ctx, meta.join("   |   "), { size: 9, color: COLORS.muted });
    if (sheet.statusText) paragraph(ctx, sheet.statusText, { size: 9, color: COLORS.muted });
    if (sheet.nextStepDate) paragraph(ctx, `Fecha de seguimiento: ${formatDate(sheet.nextStepDate)}`, { size: 9, color: COLORS.muted });

    if (sheet.description) {
      paragraph(ctx, "Descripcion / relato", { bold: true, gapBefore: 8, color: COLORS.brand });
      paragraph(ctx, sheet.description, { gapBefore: 2 });
    }
    if (sheet.guidance) {
      paragraph(ctx, "Intervencion realizada / orientacion brindada", { bold: true, gapBefore: 8, color: COLORS.brand });
      paragraph(ctx, sheet.guidance, { gapBefore: 2 });
    }
    if (sheet.nextStepDescription) {
      paragraph(ctx, "Proxima accion", { bold: true, gapBefore: 8, color: COLORS.brand });
      paragraph(ctx, sheet.nextStepDescription, { gapBefore: 2 });
    }
    if (sheet.confidentialNotes) {
      paragraph(ctx, "Notas internas confidenciales", { bold: true, gapBefore: 8, color: COLORS.brand });
      paragraph(ctx, sheet.confidentialNotes, { gapBefore: 2 });
    }
    if (sheet.attachments.length) {
      paragraph(ctx, "Adjuntos de esta hoja", { bold: true, gapBefore: 8, color: COLORS.brand });
      sheet.attachments.forEach((attachment) => paragraph(ctx, `- ${attachment.originalName} (${formatDateTime(attachment.createdAt)})`, { indent: 6 }));
    }
  });

  paragraph(ctx, "Documento generado por el sistema de la Secretaria de Seguridad Municipal.", { size: 8.5, color: COLORS.muted, gapBefore: 22 });

  return doc.save();
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

  const requestedSheetRaw = Number(new URL(request.url).searchParams.get("hoja") ?? 0);
  const requestedSheet = Number.isFinite(requestedSheetRaw) && requestedSheetRaw > 0 ? requestedSheetRaw : null;
  const selectedSheets = requestedSheet ? sheets.filter((sheet) => sheet.number === requestedSheet) : sheets;
  if (requestedSheet && !selectedSheets.length) notFound();

  const complainantsSource = intervention.complainants.length
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
  const linkedSource = intervention.linkedPersons.length
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

  const complainants: PersonLine[] = complainantsSource.map((person) => ({
    name: person.isAnonymous ? "Denunciante anonimo" : [person.firstName, person.lastName].filter(Boolean).join(" "),
    dni: person.dni,
    phone: person.phone1,
    address: person.address,
  }));
  const linkedPersons: PersonLine[] = linkedSource.map((person) => ({
    name: [person.firstName, person.apellidoApodoManual].filter(Boolean).join(" "),
    dni: person.dni,
    phone: person.phone1,
    address: person.address,
  }));

  const generalAttachments = attachments
    .filter((attachment) => attachment.entityType === "JuridicalIntervention")
    .map((attachment) => ({ originalName: attachment.originalName, createdAt: attachment.createdAt }));
  const referrals = [...intervention.destinationReferrals, ...intervention.originReferrals]
    .sort((a, b) => a.referredAt.getTime() - b.referredAt.getTime())
    .map((referral) => ({
      origin: referral.originModule,
      destination: referral.destinationModule,
      summary: referral.summary,
      referredAt: referral.referredAt,
    }));

  const pdf = await renderLegajoPdf({
    legajoNumber: intervention.internalNumber,
    requestedSheet,
    generatedAt: new Date(),
    general: requestedSheet
      ? null
      : {
          status: intervention.status,
          urgency: intervention.urgency,
          type: intervention.type,
          context: contextLabel(intervention.interventionContext),
          oficio: intervention.oficioNumber,
          expediente: intervention.expedienteNumber,
          derivedArea: intervention.derivedArea,
          attendedAt: intervention.attendedAt,
          createdAt: intervention.createdAt,
          createdByName: intervention.createdBy.name,
          origin: intervention.origin,
          complainants,
          linkedPersons,
          generalAttachments,
          referrals,
        },
    sheets: selectedSheets,
  });

  const filename = requestedSheet ? `hoja-${requestedSheet}-${intervention.internalNumber}.pdf` : `legajo-${intervention.internalNumber}.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
