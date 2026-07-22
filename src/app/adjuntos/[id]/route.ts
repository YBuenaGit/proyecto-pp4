import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCloudflareR2Storage, isR2ObjectNotFoundError } from "@/lib/cloudflare-r2";
import { prisma } from "@/lib/prisma";
import { canAccessDispatch, canAccessExpedients, canAccessJuridical } from "@/lib/rbac";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) notFound();

  const allowed =
    attachment.module === "JURIDICO"
      ? canAccessJuridical(user)
      : attachment.entityType === "InternalExpedient"
        ? canAccessExpedients(user)
        : canAccessDispatch(user);

  if (!allowed) notFound();

  const storage = getCloudflareR2Storage();
  if (attachment.encryptionVersion === 0) {
    const url = await storage.getDownloadUrl({
      objectKey: attachment.objectKey,
      originalName: attachment.originalName,
      contentType: attachment.mimeType,
    });
    return Response.redirect(url, 307);
  }

  let file: Buffer;
  try {
    file = await storage.downloadFile(attachment.objectKey, attachment.encryptionVersion);
  } catch (error) {
    if (isR2ObjectNotFoundError(error)) notFound();
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
