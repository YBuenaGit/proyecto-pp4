import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelDirectUpload, DirectUploadError } from "@/lib/direct-uploads";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/uploads/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await cancelDirectUpload(id, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof DirectUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
