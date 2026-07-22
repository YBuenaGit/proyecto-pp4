import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DirectUploadError, getDirectUploadPartUrls } from "@/lib/direct-uploads";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: RouteContext<"/api/uploads/[id]/parts">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null) as { partNumbers?: number[] } | null;
  if (!Array.isArray(body?.partNumbers)) {
    return NextResponse.json({ error: "Partes de archivo invalidas." }, { status: 400 });
  }
  try {
    const parts = await getDirectUploadPartUrls({
      sessionId: id,
      userId: user.id,
      partNumbers: body.partNumbers,
    });
    return NextResponse.json({ parts });
  } catch (error) {
    if (error instanceof DirectUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
