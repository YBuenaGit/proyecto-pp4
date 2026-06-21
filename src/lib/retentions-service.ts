import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { writeAuditLog } from "./audit";
import { nextInternalNumber } from "./form";
import { prisma } from "./prisma";
import {
  BRANDS,
  COLORS,
  RETENTION_STATUSES,
  type RetentionField,
  displayRetentionValue,
  normalizeOptionalIdentifier,
} from "./retentions";

const retentionFields = [
  "actNumber",
  "actType",
  "recordNumber",
  "domain",
  "engineNumber",
  "chassisNumber",
  "vehicleType",
  "brand",
  "color",
  "description",
  "status",
] as const satisfies RetentionField[];

const requiredText = z.string().trim().min(1);
const optionalIdentifier = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => normalizeOptionalIdentifier(value));

export const retentionInputSchema = z
  .object({
    actNumber: requiredText,
    actType: z.enum(["ALCOHOLEMIA", "INFRACCION"]),
    recordNumber: requiredText,
    domain: optionalIdentifier,
    engineNumber: optionalIdentifier,
    chassisNumber: optionalIdentifier,
    vehicleType: z.enum(["AUTO", "CAMION", "CAMIONETA", "COLECTIVO", "CUATRICICLO", "MOTO", "OTRO"]),
    brand: requiredText.refine((value) => (BRANDS as readonly string[]).includes(value), "Marca invalida."),
    color: requiredText.refine((value) => (COLORS as readonly string[]).includes(value), "Color invalido."),
    description: requiredText,
    status: z.enum(["PENDIENTE", "ENTREGADO"]).default("PENDIENTE"),
  })
  .refine((value) => Boolean(value.domain || value.engineNumber || value.chassisNumber), {
    message: "Completa al menos dominio, motor o chasis.",
    path: ["domain"],
  });

export type ParsedRetentionInput = z.infer<typeof retentionInputSchema>;

export const retentionListInclude = {
  createdBy: { select: { name: true } },
  _count: { select: { histories: true, attachments: true } },
} satisfies Prisma.RetentionInclude;

export const retentionDetailInclude = {
  createdBy: { select: { name: true } },
  histories: {
    include: { editedBy: { select: { name: true } } },
    orderBy: { editedAt: "desc" as const },
  },
  attachments: {
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.RetentionInclude;

export type RetentionListRecord = Prisma.RetentionGetPayload<{ include: typeof retentionListInclude }>;
export type RetentionDetailRecord = Prisma.RetentionGetPayload<{ include: typeof retentionDetailInclude }>;

function serializeBase(record: {
  id: string;
  internalNumber: string;
  dateTime: Date;
  actNumber: string;
  actType: string;
  recordNumber: string;
  domain: string | null;
  engineNumber: string | null;
  chassisNumber: string | null;
  vehicleType: string;
  brand: string;
  color: string;
  description: string;
  status: string;
  createdBy: { name: string };
}) {
  return {
    id: record.id,
    internalNumber: record.internalNumber,
    dateTime: record.dateTime.toISOString(),
    actNumber: record.actNumber,
    actType: record.actType,
    recordNumber: record.recordNumber,
    domain: record.domain ?? "",
    engineNumber: record.engineNumber ?? "",
    chassisNumber: record.chassisNumber ?? "",
    vehicleType: record.vehicleType,
    brand: record.brand,
    color: record.color,
    description: record.description,
    status: record.status,
    createdBy: record.createdBy.name,
  };
}

export function serializeRetentionListItem(record: RetentionListRecord) {
  return {
    ...serializeBase(record),
    historyCount: record._count.histories,
    attachmentCount: record._count.attachments,
  };
}

export function serializeRetentionDetail(record: RetentionDetailRecord) {
  return {
    ...serializeBase(record),
    histories: record.histories.map((history) => ({
      id: history.id,
      field: history.field,
      oldValue: history.oldValue ?? "N/A",
      newValue: history.newValue ?? "N/A",
      editedBy: history.editedBy.name,
      editedAt: history.editedAt.toISOString(),
    })),
    attachments: record.attachments.map((attachment) => ({
      id: attachment.id,
      downloadUrl: `/api/retenciones/${record.id}/archivos/${attachment.id}`,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      uploadedBy: attachment.uploadedBy.name,
      createdAt: attachment.createdAt.toISOString(),
    })),
  };
}

export async function getRetentionDetail(id: string) {
  const record = await prisma.retention.findUnique({
    where: { id },
    include: retentionDetailInclude,
  });
  return record ? serializeRetentionDetail(record) : null;
}

function fieldValue(record: ParsedRetentionInput | Prisma.RetentionGetPayload<object>, field: RetentionField) {
  const value = record[field];
  return typeof value === "string" ? value : value ?? "";
}

function retentionData(input: ParsedRetentionInput) {
  return {
    actNumber: input.actNumber,
    actType: input.actType,
    recordNumber: input.recordNumber,
    domain: input.domain,
    engineNumber: input.engineNumber,
    chassisNumber: input.chassisNumber,
    vehicleType: input.vehicleType,
    brand: input.brand,
    color: input.color,
    description: input.description,
    status: input.status,
  };
}

export async function createRetention(input: ParsedRetentionInput, createdById: string) {
  const internalNumber = await nextInternalNumber("RET", "retention");
  const record = await prisma.retention.create({
    data: {
      internalNumber,
      createdById,
      ...retentionData(input),
    },
    include: retentionDetailInclude,
  });

  await writeAuditLog({
    module: "RETENCIONES",
    entityType: "Retention",
    entityId: record.id,
    action: "CREATE",
    createdById,
    after: serializeRetentionDetail(record),
  });

  return serializeRetentionDetail(record);
}

export async function updateRetention(id: string, input: ParsedRetentionInput, editedById: string) {
  const before = await prisma.retention.findUnique({ where: { id } });
  if (!before) return null;

  const histories = retentionFields.flatMap((field) => {
    const oldValue = fieldValue(before, field);
    const newValue = fieldValue(input, field);
    if (oldValue === newValue) return [];
    return {
      retentionId: id,
      field,
      oldValue: displayRetentionValue(field, oldValue),
      newValue: displayRetentionValue(field, newValue),
      editedById,
    };
  });

  await prisma.$transaction(async (tx) => {
    await tx.retention.update({
      where: { id },
      data: retentionData(input),
    });
    if (histories.length) await tx.retentionHistory.createMany({ data: histories });
  });

  const after = await prisma.retention.findUniqueOrThrow({
    where: { id },
    include: retentionDetailInclude,
  });

  await writeAuditLog({
    module: "RETENCIONES",
    entityType: "Retention",
    entityId: id,
    action: before.status !== input.status ? "STATUS_CHANGE" : "UPDATE",
    createdById: editedById,
    before,
    after: serializeRetentionDetail(after),
  });

  return serializeRetentionDetail(after);
}

export function retentionStatusValues() {
  return RETENTION_STATUSES.map(([value]) => value);
}
