import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCloudflareR2Storage, isR2ObjectNotFoundError } from "@/lib/cloudflare-r2";
import { prisma } from "@/lib/prisma";
import { canAccessRetentions } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function notFoundResponse() {
  return NextResponse.json({ error: "No encontrado." }, { status: 404 });
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canAccessRetentions(user)) return notFoundResponse();

  const { id, attachmentId } = await ctx.params;
  const attachment = await prisma.retentionAttachment.findFirst({
    where: { id: attachmentId, retentionId: id },
  });
  if (!attachment) return notFoundResponse();

  let file: Buffer;
  try {
    file = await getCloudflareR2Storage().downloadFile(
      attachment.objectKey,
      attachment.encryptionVersion,
    );
  } catch (error) {
    if (isR2ObjectNotFoundError(error)) return notFoundResponse();
    throw error;
  }

  const encodedName = encodeURIComponent(attachment.originalName);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
