import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { completeDirectUpload, DirectUploadError } from "@/lib/direct-uploads";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: RouteContext<"/api/uploads/[id]/complete">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null) as {
    parts?: Array<{ partNumber?: number; eTag?: string }>;
  } | null;
  if (!Array.isArray(body?.parts)) {
    return NextResponse.json({ error: "Partes de archivo invalidas." }, { status: 400 });
  }
  try {
    return NextResponse.json(await completeDirectUpload({
      sessionId: id,
      userId: user.id,
      parts: body.parts.map((part) => ({
        partNumber: Number(part.partNumber),
        eTag: typeof part.eTag === "string" ? part.eTag : "",
      })),
    }));
  } catch (error) {
    if (error instanceof DirectUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
