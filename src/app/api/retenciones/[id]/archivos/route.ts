import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadFileToCloudflareR2 } from "@/lib/cloudflare-r2";
import { prisma } from "@/lib/prisma";
import { canAccessRetentions } from "@/lib/rbac";
import { getRetentionDetail } from "@/lib/retentions-service";

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

function isUploadFile(entry: FormDataEntryValue): entry is File {
  return typeof File !== "undefined" && entry instanceof File && entry.size > 0;
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/retenciones/[id]/archivos">) {
  const auth = await getRetentionsUser();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  const exists = await prisma.retention.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return notFoundResponse();

  const formData = await request.formData();
  const files = formData.getAll("files").filter(isUploadFile);
  if (!files.length) return NextResponse.json({ error: "No se recibieron archivos." }, { status: 400 });

  for (const file of files) {
    const uploaded = await uploadFileToCloudflareR2({
      file,
      folder: `retenciones/${id}`,
    });

    await prisma.retentionAttachment.create({
      data: {
        retentionId: id,
        objectKey: uploaded.objectKey,
        publicUrl: uploaded.publicUrl,
        fileName: uploaded.fileName,
        originalName: file.name,
        mimeType: uploaded.contentType,
        size: uploaded.size,
        uploadedById: auth.user.id,
      },
    });
  }

  const item = await getRetentionDetail(id);
  return NextResponse.json({ item });
}
