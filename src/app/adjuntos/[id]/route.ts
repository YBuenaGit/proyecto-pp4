import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/auth";
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

  const storageRoot = path.resolve(process.cwd(), "storage");
  const relativeInsideStorage = attachment.filePath.replace(/^storage[\\/]/, "");
  const absolutePath = path.resolve(storageRoot, relativeInsideStorage);
  if (!absolutePath.startsWith(storageRoot)) notFound();

  const file = await readFile(absolutePath);
  const encodedName = encodeURIComponent(attachment.originalName);

  return new Response(file, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
    },
  });
}
