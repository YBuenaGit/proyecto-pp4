import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { nextInternalNumber } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { canAccessRetentions } from "@/lib/rbac";
import { addArgentinaDateKeyDays, parseArgentinaDate } from "@/lib/argentina-time";
import {
  normalizeOptionalIdentifier,
  type RetentionStatus,
} from "@/lib/retentions";
import {
  createRetention,
  retentionInputSchema,
  retentionListInclude,
  serializeRetentionListItem,
} from "@/lib/retentions-service";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "No autenticado." }, { status: 401 });
}

function notFoundResponse() {
  return NextResponse.json({ error: "No encontrado." }, { status: 404 });
}

async function getRetentionsUser() {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  if (!canAccessRetentions(user)) return { response: notFoundResponse() };
  return { user };
}

function pageParam(request: NextRequest, key: string, fallback: number, max: number) {
  const value = Number(request.nextUrl.searchParams.get(key));
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(Math.floor(value), max);
}

function textParam(request: NextRequest, key: string) {
  return (request.nextUrl.searchParams.get(key) ?? "").trim();
}

function contains(value: string): Prisma.StringFilter<"Retention"> {
  return { contains: value, mode: "insensitive" };
}

function buildWhere(request: NextRequest): Prisma.RetentionWhereInput {
  const where: Prisma.RetentionWhereInput = {};
  const fromKey = textParam(request, "from");
  const toKey = textParam(request, "to");
  const from = fromKey ? parseArgentinaDate(fromKey) : null;
  const toExclusive = toKey ? parseArgentinaDate(addArgentinaDateKeyDays(toKey, 1)) : null;
  if (from || toExclusive) {
    where.dateTime = { ...(from ? { gte: from } : {}), ...(toExclusive ? { lt: toExclusive } : {}) };
  }

  const actNumber = textParam(request, "actNumber");
  const recordNumber = textParam(request, "recordNumber");
  const actType = textParam(request, "actType");
  const vehicleType = textParam(request, "vehicleType");
  const brand = textParam(request, "brand");
  const color = textParam(request, "color");
  const status = textParam(request, "status") as RetentionStatus;
  const domain = normalizeOptionalIdentifier(textParam(request, "domain"));
  const engineNumber = normalizeOptionalIdentifier(textParam(request, "engineNumber"));
  const chassisNumber = normalizeOptionalIdentifier(textParam(request, "chassisNumber"));

  if (actNumber) where.actNumber = contains(actNumber);
  if (recordNumber) where.recordNumber = contains(recordNumber);
  if (actType) where.actType = actType;
  if (domain) where.domain = contains(domain);
  if (engineNumber) where.engineNumber = contains(engineNumber);
  if (chassisNumber) where.chassisNumber = contains(chassisNumber);
  if (vehicleType) where.vehicleType = vehicleType;
  if (brand) where.brand = brand;
  if (color) where.color = color;
  if (status && ["PENDIENTE", "ENTREGADO"].includes(status)) where.status = status;

  return where;
}

export async function GET(request: NextRequest) {
  const auth = await getRetentionsUser();
  if ("response" in auth) return auth.response;

  const page = pageParam(request, "page", 1, 10_000);
  const pageSize = pageParam(request, "pageSize", 25, 100);
  const where = buildWhere(request);

  const [total, records] = await Promise.all([
    prisma.retention.count({ where }),
    prisma.retention.findMany({
      where,
      include: retentionListInclude,
      orderBy: [{ dateTime: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    items: records.map(serializeRetentionListItem),
    total,
    page,
    pageSize,
    nextInternalNumber: await nextInternalNumber("RET", "retention"),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getRetentionsUser();
  if ("response" in auth) return auth.response;

  const parsed = retentionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos invalidos.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const record = await createRetention(parsed.data, auth.user.id);
  return NextResponse.json({ item: record }, { status: 201 });
}
