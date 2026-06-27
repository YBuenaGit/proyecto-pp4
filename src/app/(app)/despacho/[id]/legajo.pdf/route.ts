import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatDateTime, labelFromValue } from "@/lib/format";
import { parseJuridicalActionContent } from "@/lib/juridical-action-content";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessDispatch } from "@/lib/rbac";
import { personDisplayName } from "@/lib/text";

type PdfLine = {
  text: string;
  size?: number;
  bold?: boolean;
  gapBefore?: number;
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 46;
const bottomMargin = 42;

function asciiText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function escapePdfText(value: string) {
  return asciiText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, size: number) {
  const maxChars = Math.max(36, Math.floor((pageWidth - margin * 2) / (size * 0.48)));
  const lines: string[] = [];

  asciiText(text).split(/\r?\n/).forEach((paragraph) => {
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
    y -= line.gapBefore ?? 0;
    wrapText(line.text, size).forEach((wrappedLine) => {
      if (y < bottomMargin) newPage();
      pages[pages.length - 1].push({ text: wrappedLine, size, bold: Boolean(line.bold), y });
      y -= size + 4;
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

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(pdf);
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "binary");
}

function pushField(lines: PdfLine[], label: string, value: string | null | undefined) {
  lines.push({ text: `${label}: ${value?.trim() || "-"}` });
}

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
    },
  });

  if (!record) notFound();

  const lines: PdfLine[] = [
    { text: "Legajo de despacho", size: 18, bold: true },
    { text: record.internalNumber, size: 14, bold: true, gapBefore: 6 },
    { text: "Datos principales", size: 13, bold: true, gapBefore: 16 },
  ];

  pushField(lines, "Estado", labelFromValue(record.status));
  pushField(lines, "Prioridad", labelFromValue(record.priority));
  pushField(lines, "Categoria", labelFromValue(record.category));
  pushField(lines, "Fecha de atencion", formatDateTime(record.attendedAt));
  pushField(lines, "Usuario que atendio", record.createdBy.name);
  pushField(lines, "Area derivada", record.referredArea);
  pushField(lines, "Descripcion", record.description);
  pushField(lines, "Orientacion brindada", record.initialGuidance);

  lines.push({ text: "Personas denunciantes", size: 13, bold: true, gapBefore: 16 });
  record.complainants.forEach((person, index) => {
    const name = person.isAnonymous ? "Denunciante anonimo" : personDisplayName(person.lastName, person.firstName);
    lines.push({ text: `${index + 1}. ${name || "-"} - DNI ${person.dni || "-"} - Tel. ${person.phone1 || "-"}` });
  });
  if (!record.complainants.length) lines.push({ text: "Sin denunciantes cargados." });

  lines.push({ text: "Personas denunciadas / vinculadas", size: 13, bold: true, gapBefore: 16 });
  record.linkedPersons.forEach((person, index) => {
    const name = personDisplayName(person.apellidoApodoManual, person.firstName);
    lines.push({ text: `${index + 1}. ${name || "-"} - DNI ${person.dni || "-"} - Tel. ${person.phone1 || "-"}` });
  });
  if (!record.linkedPersons.length) lines.push({ text: "Sin personas vinculadas cargadas." });

  lines.push({ text: "Seguimientos", size: 13, bold: true, gapBefore: 16 });
  record.followUps.forEach((followUp, index) => {
    const parsed = parseJuridicalActionContent(followUp.content);
    lines.push({ text: `Seguimiento ${index + 1} - ${formatDateTime(followUp.createdAt)} - ${followUp.createdBy.name}`, bold: true, gapBefore: 8 });
    pushField(lines, "Estado posterior", followUp.statusAfter ? labelFromValue(followUp.statusAfter) : "-");
    pushField(lines, "Descripcion / relato", parsed.description || followUp.content);
    if (parsed.guidanceProvided) pushField(lines, "Intervencion / orientacion", parsed.guidanceProvided);
  });
  if (!record.followUps.length) lines.push({ text: "Sin seguimientos cargados." });

  const pdf = buildPdf(lines);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `inline; filename="legajo-${record.internalNumber}.pdf"`,
    },
  });
}
