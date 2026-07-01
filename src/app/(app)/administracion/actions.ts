"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  CREATE_USER_DUPLICATE_EMAIL_MESSAGE,
  CREATE_USER_DUPLICATE_MESSAGE,
  CREATE_USER_DUPLICATE_USERNAME_MESSAGE,
  CREATE_USER_SUCCESS_MESSAGE,
  RESET_USER_PASSWORD_SUCCESS_MESSAGE,
  createUserErrorState,
  createUserSchema,
  resetUserPasswordErrorState,
  resetUserPasswordSchema,
  type CreateUserActionState,
  type CreateUserFieldErrors,
  type ResetUserPasswordActionState,
  type ResetUserPasswordFieldErrors,
} from "@/lib/admin-users";
import { optionalText, sentenceText, text } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { assertAccess, canAccessAdmin } from "@/lib/rbac";

function uniqueUserErrorState(error: unknown): CreateUserActionState | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;

  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : typeof target === "string" ? [target] : [];
  const fieldErrors: CreateUserFieldErrors = {};

  if (fields.includes("username")) fieldErrors.username = [CREATE_USER_DUPLICATE_USERNAME_MESSAGE];
  if (fields.includes("email")) fieldErrors.email = [CREATE_USER_DUPLICATE_EMAIL_MESSAGE];

  return createUserErrorState(
    fieldErrors,
    Object.keys(fieldErrors).length ? CREATE_USER_DUPLICATE_MESSAGE : "No se pudo crear el usuario.",
  );
}

export async function createUser(_prevState: CreateUserActionState, formData: FormData): Promise<CreateUserActionState> {
  const currentUser = await requireUser();
  assertAccess(canAccessAdmin(currentUser));
  const parsed = createUserSchema.safeParse({
    name: sentenceText(formData, "name"),
    username: text(formData, "username"),
    email: text(formData, "email"),
    role: text(formData, "role"),
    password: text(formData, "password"),
    passwordConfirm: text(formData, "passwordConfirm"),
  });

  if (!parsed.success) {
    return createUserErrorState(parsed.error.flatten().fieldErrors as CreateUserFieldErrors);
  }

  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: { equals: parsed.data.username, mode: "insensitive" } },
        { email: { equals: parsed.data.email, mode: "insensitive" } },
      ],
    },
    select: { username: true, email: true },
  });
  const fieldErrors: CreateUserFieldErrors = {};
  if (existingUsers.some((user) => user.username.toLowerCase() === parsed.data.username.toLowerCase())) {
    fieldErrors.username = [CREATE_USER_DUPLICATE_USERNAME_MESSAGE];
  }
  if (existingUsers.some((user) => user.email?.toLowerCase() === parsed.data.email.toLowerCase())) {
    fieldErrors.email = [CREATE_USER_DUPLICATE_EMAIL_MESSAGE];
  }
  if (Object.keys(fieldErrors).length) return createUserErrorState(fieldErrors, CREATE_USER_DUPLICATE_MESSAGE);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username: parsed.data.username,
        email: parsed.data.email,
        role: parsed.data.role,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        active: true,
      },
    });
  } catch (error) {
    const uniqueState = uniqueUserErrorState(error);
    if (uniqueState) return uniqueState;
    throw error;
  }
  await writeAuditLog({
    module: "ADMIN",
    entityType: "User",
    entityId: user.id,
    action: "CREATE",
    createdById: currentUser.id,
    after: { id: user.id, username: user.username, role: user.role },
  });
  revalidatePath("/administracion");
  return {
    status: "success",
    message: CREATE_USER_SUCCESS_MESSAGE,
    fieldErrors: {},
    toastKey: user.id,
  };
}

export async function resetUserPassword(
  userId: string,
  _prevState: ResetUserPasswordActionState,
  formData: FormData,
): Promise<ResetUserPasswordActionState> {
  const currentUser = await requireUser();
  assertAccess(canAccessAdmin(currentUser));
  const parsed = resetUserPasswordSchema.safeParse({
    password: text(formData, "password"),
    passwordConfirm: text(formData, "passwordConfirm"),
  });

  if (!parsed.success) {
    return resetUserPasswordErrorState(parsed.error.flatten().fieldErrors as ResetUserPasswordFieldErrors);
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, active: true },
  });

  if (!before) {
    return resetUserPasswordErrorState({}, "No se encontro el usuario.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [, closedSessions] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  await writeAuditLog({
    module: "ADMIN",
    entityType: "User",
    entityId: userId,
    action: "UPDATE",
    createdById: currentUser.id,
    before: { id: before.id, username: before.username, role: before.role, active: before.active },
    after: { passwordReset: true, closedSessions: closedSessions.count },
  });
  revalidatePath("/administracion");
  return {
    status: "success",
    message: RESET_USER_PASSWORD_SUCCESS_MESSAGE,
    fieldErrors: {},
    toastKey: `${userId}-${Date.now()}`,
  };
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
  const label = sentenceText(formData, "label");
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
