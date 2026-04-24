"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import { optionalText, text } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessAdmin } from "@/lib/rbac";

const userSchema = z.object({
  name: z.string().min(3),
  username: z.string().min(3),
  email: z.string().email().optional().nullable(),
  role: z.string().refine((value) => Object.values(ROLES).includes(value as keyof typeof ROLES)),
  password: z.string().min(6),
});

export async function createUser(formData: FormData) {
  const currentUser = await requireUser();
  assertAccess(canAccessAdmin(currentUser));
  const parsed = userSchema.parse({
    name: text(formData, "name"),
    username: text(formData, "username"),
    email: optionalText(formData, "email"),
    role: text(formData, "role"),
    password: text(formData, "password"),
  });

  const user = await prisma.user.create({
    data: {
      name: parsed.name,
      username: parsed.username,
      email: parsed.email,
      role: parsed.role,
      passwordHash: await bcrypt.hash(parsed.password, 10),
      active: true,
    },
  });
  await writeAuditLog({
    module: "ADMIN",
    entityType: "User",
    entityId: user.id,
    action: "CREATE",
    createdById: currentUser.id,
    after: { id: user.id, username: user.username, role: user.role },
  });
  revalidatePath("/administracion");
  redirect("/administracion");
}

export async function toggleUserActive(userId: string) {
  const currentUser = await requireUser();
  assertAccess(canAccessAdmin(currentUser));
  if (userId === currentUser.id) return;
  const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const after = await prisma.user.update({
    where: { id: userId },
    data: { active: !before.active },
  });
  await writeAuditLog({
    module: "ADMIN",
    entityType: "User",
    entityId: userId,
    action: "UPDATE",
    createdById: currentUser.id,
    before: { active: before.active },
    after: { active: after.active },
  });
  revalidatePath("/administracion");
  redirect("/administracion");
}

export async function createCatalogItem(formData: FormData) {
  const currentUser = await requireUser();
  assertAccess(canAccessAdmin(currentUser));
  const type = text(formData, "type");
  const value = text(formData, "value");
  const label = text(formData, "label");
  if (!type || !value || !label) return;

  const item = await prisma.catalogItem.create({
    data: {
      type,
      module: optionalText(formData, "module"),
      value,
      label,
      sortOrder: Number(text(formData, "sortOrder") || 0),
      createdById: currentUser.id,
    },
  });
  await writeAuditLog({
    module: "ADMIN",
    entityType: "CatalogItem",
    entityId: item.id,
    action: "CREATE",
    createdById: currentUser.id,
    after: item,
  });
  revalidatePath("/administracion");
  redirect("/administracion");
}
