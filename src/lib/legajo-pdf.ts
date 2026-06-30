import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { formatDate, formatDateTime, labelFromValue } from "@/lib/format";

export type LegajoPdfField = {
  label: string;
  value: string | null | undefined;
};

export type LegajoPdfPerson = {
  name: string;
  dni?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type LegajoPdfAttachment = {
  originalName: string;
  createdAt: Date;
};

export type LegajoPdfReferral = {
  origin: string;
  destination: string;
  summary: string;
  referredAt: Date;
  status?: string | null;
};

export type LegajoPdfSheet = {
  number: number;
  date: Date;
  actor: string;
  role: string;
  type?: string | null;
  statusText?: string | null;
  description?: string | null;
  guidance?: string | null;
  nextStepDescription?: string | null;
  nextStepDate?: Date | null;
  attachments: LegajoPdfAttachment[];
};

export type LegajoPdfInput = {
  title: string;
  generatedAt: Date;
  createdAt: Date;
  createdByName: string;
  requestedSheet: number | null;
  generalFields: LegajoPdfField[] | null;
  complainants: LegajoPdfPerson[] | null;
  linkedPersons: LegajoPdfPerson[] | null;
  generalAttachments: LegajoPdfAttachment[] | null;
  referrals: LegajoPdfReferral[] | null;
  sheets: LegajoPdfSheet[];
};

type PdfColor = ReturnType<typeof rgb>;

type Ctx = {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  muniLogo?: PDFImage;
  secretaryLogo?: PDFImage;
  page: PDFPage;
  y: number;
  pageNo: number;
};

const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = 44;
const BOTTOM = 58;
const CONTENT_W = PAGE.w - MARGIN * 2;
const COLUMN_GAP = 12;

const COLORS = {
  navy: rgb(0.035, 0.153, 0.302),
  blue: rgb(0.02, 0.384, 0.631),
  sky: rgb(0.839, 0.914, 0.969),
  pale: rgb(0.941, 0.973, 0.992),
  line: rgb(0.749, 0.835, 0.902),
  ink: rgb(0.118, 0.145, 0.173),
  muted: rgb(0.404, 0.459, 0.518),
  white: rgb(1, 1, 1),
};

const ORDINAL_ATTENTION = ["", "Primera atencion"];
const ORDINAL_INTERVENTION = ["", "", "Segunda intervencion", "Tercera intervencion", "Cuarta intervencion", "Quinta intervencion", "Sexta intervencion", "Septima intervencion", "Octava intervencion", "Novena intervencion", "Decima intervencion"];

function asciiText(value: string) {
  return value
    .replace(/\u2192/g, "->")
    .replace(/\t/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function display(value: string | null | undefined) {
  return asciiText(value?.trim() || "-");
}

function formatLongDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function sheetTitle(number: number) {
  if (number === 1) return ORDINAL_ATTENTION[1];
  return ORDINAL_INTERVENTION[number] ?? `Intervencion ${number}`;
}

function personLine(person: LegajoPdfPerson) {
  return `${display(person.name)} - DNI ${display(person.dni)} - Tel. ${display(person.phone)} - Dom. ${display(person.address)}`;
}

async function loadPng(doc: PDFDocument, filename: string) {
  try {
    const bytes = await readFile(join(process.cwd(), "public", filename));
    return await doc.embedPng(bytes);
  } catch {
    return undefined;
  }
}

function drawImageFit(page: PDFPage, image: PDFImage, box: { x: number; y: number; w: number; h: number }) {
  const scale = Math.min(box.w / image.width, box.h / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, {
    x: box.x + (box.w - width) / 2,
    y: box.y + (box.h - height) / 2,
    width,
    height,
  });
}

function drawRightText(ctx: Ctx, text: string, xRight: number, y: number, size: number, font: PDFFont, color: PdfColor) {
  const clean = asciiText(text);
  const width = font.widthOfTextAtSize(clean, size);
  ctx.page.drawText(clean, { x: xRight - width, y, size, font, color });
}

function drawFooter(ctx: Ctx) {
  ctx.page.drawRectangle({ x: MARGIN, y: 40, width: CONTENT_W, height: 0.6, color: COLORS.line });
  ctx.page.drawText("Documento reservado - Sistema interno de gestion juridica y operativa", {
    x: MARGIN,
    y: 26,
    size: 7.5,
    font: ctx.italic,
    color: COLORS.muted,
  });
  drawRightText(ctx, `Pagina ${ctx.pageNo}`, PAGE.w - MARGIN, 26, 7.5, ctx.font, COLORS.muted);
}

function drawHeader(ctx: Ctx) {
  const top = PAGE.h - 32;
  if (ctx.muniLogo) {
    drawImageFit(ctx.page, ctx.muniLogo, { x: MARGIN, y: top - 43, w: 112, h: 39 });
  }

  const logoSize = 42;
  const logoX = PAGE.w - MARGIN - logoSize;
  if (ctx.secretaryLogo) {
    drawImageFit(ctx.page, ctx.secretaryLogo, { x: logoX, y: top - logoSize, w: logoSize, h: logoSize });
  }

  const textRight = logoX - 10;
  drawRightText(ctx, "Secretaria de Seguridad Ciudadana", textRight, top - 14, 9.4, ctx.bold, COLORS.navy);
  drawRightText(ctx, "Legajo institucional", textRight, top - 28, 8.2, ctx.italic, COLORS.blue);

  ctx.page.drawRectangle({ x: MARGIN, y: top - 53, width: CONTENT_W, height: 1.2, color: COLORS.blue });
  drawFooter(ctx);
  ctx.y = top - 78;
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
  opts: { size?: number; bold?: boolean; italic?: boolean; color?: PdfColor; gapBefore?: number; indent?: number; maxWidth?: number } = {},
) {
  const size = opts.size ?? 9.6;
  const font = opts.bold ? ctx.bold : opts.italic ? ctx.italic : ctx.font;
  const color = opts.color ?? COLORS.ink;
  const indent = opts.indent ?? 0;
  const maxWidth = opts.maxWidth ?? CONTENT_W - indent;
  const lineHeight = size + 4.2;
  if (opts.gapBefore) ctx.y -= opts.gapBefore;
  wrapText(text, font, size, maxWidth).forEach((line) => {
    ensure(ctx, lineHeight);
    if (line) ctx.page.drawText(line, { x: MARGIN + indent, y: ctx.y, size, font, color });
    ctx.y -= lineHeight;
  });
}

function drawIntro(ctx: Ctx, input: LegajoPdfInput) {
  const height = 98;
  ensure(ctx, height + 8);
  const top = ctx.y;
  const bottom = top - height;
  ctx.page.drawRectangle({ x: MARGIN, y: bottom, width: CONTENT_W, height, color: COLORS.pale, borderColor: COLORS.line, borderWidth: 0.8 });
  ctx.page.drawRectangle({ x: MARGIN, y: bottom, width: 5, height, color: COLORS.blue });

  ctx.page.drawText(asciiText(input.title), { x: MARGIN + 18, y: top - 28, size: 20, font: ctx.bold, color: COLORS.navy });
  ctx.page.drawText("Sistema interno de documentacion", { x: MARGIN + 18, y: top - 45, size: 9, font: ctx.italic, color: COLORS.muted });

  drawRightText(ctx, "Fecha de emision", PAGE.w - MARGIN - 16, top - 23, 8.3, ctx.bold, COLORS.blue);
  drawRightText(ctx, formatLongDate(input.generatedAt), PAGE.w - MARGIN - 16, top - 38, 10, ctx.font, COLORS.ink);

  ctx.page.drawText("Fecha de creacion", { x: MARGIN + 18, y: bottom + 28, size: 8.3, font: ctx.bold, color: COLORS.blue });
  ctx.page.drawText(formatLongDate(input.createdAt), { x: MARGIN + 18, y: bottom + 14, size: 9.2, font: ctx.font, color: COLORS.ink });
  ctx.page.drawText("Creado por", { x: MARGIN + 198, y: bottom + 28, size: 8.3, font: ctx.bold, color: COLORS.blue });
  ctx.page.drawText(display(input.createdByName), { x: MARGIN + 198, y: bottom + 14, size: 9.2, font: ctx.font, color: COLORS.ink });

  ctx.y = bottom - 16;
}

function sectionTitle(ctx: Ctx, text: string) {
  ctx.y -= 8;
  ensure(ctx, 34);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 8, width: CONTENT_W, height: 25, color: COLORS.sky });
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 8, width: 5, height: 25, color: COLORS.blue });
  ctx.page.drawText(asciiText(text), { x: MARGIN + 14, y: ctx.y, size: 12.4, font: ctx.bold, color: COLORS.navy });
  ctx.y -= 31;
}

function smallTitle(ctx: Ctx, text: string) {
  paragraph(ctx, text, { size: 10.5, bold: true, color: COLORS.blue, gapBefore: 5 });
}

function fieldGrid(ctx: Ctx, fields: LegajoPdfField[]) {
  const columnW = (CONTENT_W - COLUMN_GAP) / 2;
  let column = 0;
  let rowTop = ctx.y;
  let rowHeight = 0;

  fields.forEach((field, index) => {
    const label = display(field.label);
    const value = display(field.value);
    const valueLines = wrapText(value, ctx.font, 9.2, columnW - 18);
    const height = Math.max(44, 22 + valueLines.length * 12);
    if (column === 0) {
      ensure(ctx, height + 8);
      rowTop = ctx.y;
      rowHeight = height;
    } else {
      rowHeight = Math.max(rowHeight, height);
      ensure(ctx, rowHeight + 8);
    }

    const x = MARGIN + column * (columnW + COLUMN_GAP);
    const y = rowTop - height;
    ctx.page.drawRectangle({ x, y, width: columnW, height, color: rgb(0.985, 0.992, 1), borderColor: COLORS.line, borderWidth: 0.5 });
    ctx.page.drawText(label, { x: x + 9, y: rowTop - 14, size: 7.8, font: ctx.bold, color: COLORS.blue });
    valueLines.forEach((line, lineIndex) => {
      ctx.page.drawText(line, { x: x + 9, y: rowTop - 29 - lineIndex * 12, size: 9.2, font: ctx.font, color: COLORS.ink });
    });

    column = column === 0 ? 1 : 0;
    if (column === 0 || index === fields.length - 1) {
      ctx.y = rowTop - rowHeight - 8;
    }
  });
}

function listPeople(ctx: Ctx, people: LegajoPdfPerson[], emptyText: string) {
  if (!people.length) {
    paragraph(ctx, emptyText, { italic: true, color: COLORS.muted, indent: 8 });
    return;
  }
  people.forEach((person, index) => paragraph(ctx, `${index + 1}. ${personLine(person)}`, { indent: 8 }));
}

function drawReferrals(ctx: Ctx, referrals: LegajoPdfReferral[]) {
  referrals.forEach((referral, index) => {
    const statusText = referral.status ? ` - ${labelFromValue(referral.status)}` : "";
    paragraph(ctx, `${index + 1}. ${display(referral.origin)} -> ${display(referral.destination)} - ${formatDateTime(referral.referredAt)}${statusText}`, {
      bold: true,
      color: COLORS.navy,
      indent: 8,
    });
    paragraph(ctx, referral.summary, { indent: 18, color: COLORS.ink });
  });
}

function drawAttachments(ctx: Ctx, attachments: LegajoPdfAttachment[]) {
  attachments.forEach((attachment, index) => {
    paragraph(ctx, `${index + 1}. ${attachment.originalName} (${formatDateTime(attachment.createdAt)})`, { indent: 8 });
  });
}

function drawSheet(ctx: Ctx, sheet: LegajoPdfSheet) {
  ctx.y -= 8;
  ensure(ctx, 78);
  const top = ctx.y;
  const height = 54;
  const bottom = top - height;
  ctx.page.drawRectangle({ x: MARGIN, y: bottom, width: CONTENT_W, height, color: COLORS.navy });
  ctx.page.drawRectangle({ x: MARGIN, y: bottom, width: 6, height, color: COLORS.blue });
  ctx.page.drawText(sheetTitle(sheet.number), { x: MARGIN + 18, y: top - 23, size: 15, font: ctx.bold, color: COLORS.white });
  const meta = `${formatDateTime(sheet.date)} - ${display(sheet.actor)} (${labelFromValue(sheet.role)})`;
  ctx.page.drawText(asciiText(meta), { x: MARGIN + 18, y: top - 40, size: 8.8, font: ctx.italic, color: COLORS.sky });
  if (sheet.type) {
    drawRightText(ctx, labelFromValue(sheet.type), PAGE.w - MARGIN - 14, top - 24, 8.6, ctx.bold, COLORS.sky);
  }
  ctx.y = bottom - 16;

  if (sheet.statusText) paragraph(ctx, sheet.statusText, { color: COLORS.muted, italic: true });
  if (sheet.nextStepDate) paragraph(ctx, `Fecha de seguimiento: ${formatDate(sheet.nextStepDate)}`, { color: COLORS.muted, italic: true });

  if (sheet.description) {
    smallTitle(ctx, "Descripcion relato");
    paragraph(ctx, sheet.description, { indent: 8 });
  }

  if (sheet.guidance) {
    smallTitle(ctx, "Intervencion realizada / orientacion brindada");
    paragraph(ctx, sheet.guidance, { indent: 8 });
  }

  if (sheet.nextStepDescription) {
    smallTitle(ctx, "Proxima accion");
    paragraph(ctx, sheet.nextStepDescription, { indent: 8 });
  }

  if (sheet.attachments.length) {
    smallTitle(ctx, "Adjuntos de esta hoja");
    drawAttachments(ctx, sheet.attachments);
  }
}

export async function renderLegajoPdf(input: LegajoPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(input.title);
  doc.setSubject("Legajo institucional");
  doc.setCreator("Sistema interno de gestion juridica y operativa");

  const [font, bold, italic, muniLogo, secretaryLogo] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.HelveticaOblique),
    loadPng(doc, "logo-muni.png"),
    loadPng(doc, "logo-gum1.png"),
  ]);

  const ctx: Ctx = {
    doc,
    font,
    bold,
    italic,
    muniLogo,
    secretaryLogo,
    page: doc.addPage([PAGE.w, PAGE.h]),
    y: 0,
    pageNo: 1,
  };

  drawHeader(ctx);
  drawIntro(ctx, input);

  if (input.generalFields?.length) {
    sectionTitle(ctx, "Datos generales");
    fieldGrid(ctx, input.generalFields);
  }

  if (input.referrals?.length) {
    sectionTitle(ctx, "Derivaciones");
    drawReferrals(ctx, input.referrals);
  }

  if (input.complainants || input.linkedPersons) {
    sectionTitle(ctx, "Personas vinculadas");
    smallTitle(ctx, "Personas denunciantes");
    listPeople(ctx, input.complainants ?? [], "Sin personas denunciantes cargadas.");
    smallTitle(ctx, "Personas denunciadas / vinculadas");
    listPeople(ctx, input.linkedPersons ?? [], "Sin personas denunciadas o vinculadas cargadas.");
  }

  if (input.generalAttachments?.length) {
    sectionTitle(ctx, "Adjuntos generales");
    drawAttachments(ctx, input.generalAttachments);
  }

  input.sheets.forEach((sheet) => drawSheet(ctx, sheet));

  paragraph(ctx, "Emitido por la Secretaria de Seguridad Ciudadana.", {
    size: 8.4,
    italic: true,
    color: COLORS.muted,
    gapBefore: 18,
  });

  return doc.save();
}
