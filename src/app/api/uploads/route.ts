import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DirectUploadError, initiateDirectUpload } from "@/lib/direct-uploads";
import type { DirectUploadIntent } from "@/lib/direct-upload-shared";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof DirectUploadError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    intent?: DirectUploadIntent;
    name?: string;
    type?: string;
    size?: number;
  } | null;
  if (!body?.intent || typeof body.name !== "string" || typeof body.size !== "number") {
    return NextResponse.json({ error: "Datos de carga invalidos." }, { status: 400 });
  }
  try {
    return NextResponse.json(await initiateDirectUpload({
      user,
      intent: body.intent,
      originalName: body.name,
      mimeType: typeof body.type === "string" ? body.type : "",
      size: body.size,
    }), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
