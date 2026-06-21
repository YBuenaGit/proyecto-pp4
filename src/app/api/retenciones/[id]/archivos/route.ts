import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  collectUploadFiles,
  FileUploadValidationError,
  getCloudflareR2Storage,
} from "@/lib/cloudflare-r2";
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
  let files: File[];
  try {
    files = collectUploadFiles(formData.getAll("files"));
  } catch (error) {
    if (error instanceof FileUploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
  if (!files.length) return NextResponse.json({ error: "No se recibieron archivos." }, { status: 400 });

  const storage = getCloudflareR2Storage();
  for (const file of files) {
    const uploaded = await storage.uploadFile({ file });

    await prisma.retentionAttachment.create({
      data: {
        retentionId: id,
        objectKey: uploaded.objectKey,
        encryptionVersion: uploaded.encryptionVersion,
        fileName: uploaded.fileName,
        originalName: uploaded.originalName,
        mimeType: uploaded.contentType,
        size: uploaded.size,
        uploadedById: auth.user.id,
      },
    });
  }

  const item = await getRetentionDetail(id);
  return NextResponse.json({ item });
}
