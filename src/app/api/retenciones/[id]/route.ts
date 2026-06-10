import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessRetentions } from "@/lib/rbac";
import { getRetentionDetail, retentionInputSchema, updateRetention } from "@/lib/retentions-service";

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

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/retenciones/[id]">) {
  const auth = await getRetentionsUser();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  const item = await getRetentionDetail(id);
  if (!item) return notFoundResponse();

  return NextResponse.json({ item });
}

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/retenciones/[id]">) {
  const auth = await getRetentionsUser();
  if ("response" in auth) return auth.response;

  const parsed = retentionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos invalidos.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await ctx.params;
  const item = await updateRetention(id, parsed.data, auth.user.id);
  if (!item) return notFoundResponse();

  return NextResponse.json({ item });
}
