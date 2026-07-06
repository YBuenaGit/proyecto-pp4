"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationsRead(notificationKeys: string[]) {
  const user = await requireUser();
  const keys = Array.from(new Set(notificationKeys.map((key) => key.trim()).filter(Boolean)));
  if (!keys.length) return;

  await prisma.notificationRead.createMany({
    data: keys.map((notificationKey) => ({
      userId: user.id,
      notificationKey,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/");
}
