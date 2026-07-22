import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessRetentions } from "@/lib/rbac";
import { getRetentionDetail, retentionInputSchema, updateRetention } from "@/lib/retentions-service";
import { consumeRetentionUploads, DirectUploadError } from "@/lib/direct-uploads";

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

  const body = await request.json().catch(() => null) as {
    input?: unknown;
    uploadSessionIds?: unknown;
  } | null;
  const parsed = retentionInputSchema.safeParse(body?.input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos invalidos.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await ctx.params;
  const uploadSessionIds = Array.isArray(body?.uploadSessionIds)
    ? body.uploadSessionIds.filter((value): value is string => typeof value === "string")
    : [];
  try {
    const item = await updateRetention(id, parsed.data, auth.user.id);
    if (!item) return notFoundResponse();
    await consumeRetentionUploads({
      uploadSessionIds,
      retentionId: id,
      uploadedById: auth.user.id,
      scopeId: id,
    });
    return NextResponse.json({ item: await getRetentionDetail(id) });
  } catch (error) {
    if (error instanceof DirectUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
