import "server-only";

import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sqliteExecute, sqliteNow, sqliteQueryOne } from "./sqlite";
import type { CurrentUser } from "./types";

export const SESSION_COOKIE = "seguridad_session";
const SESSION_DAYS = 1;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type UserRow = CurrentUser & {
  passwordHash: string;
  active: number | boolean;
};

type SessionUserRow = UserRow & {
  sessionId: string;
  expiresAt: number | string;
};

function rowToCurrentUser(row: UserRow): CurrentUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
  };
}

function sqliteDate(value: number | string) {
  return new Date(typeof value === "number" ? value : value);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await sqliteExecute(
    `INSERT INTO Session (id, tokenHash, userId, expiresAt, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [randomUUID(), tokenHash, userId, expiresAt.getTime(), sqliteNow()],
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await sqliteExecute("DELETE FROM Session WHERE tokenHash = ?", [hashToken(token)]);
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await sqliteQueryOne<SessionUserRow>(
    `SELECT
       s.id AS sessionId,
       s.expiresAt AS expiresAt,
       u.id AS id,
       u.name AS name,
       u.username AS username,
       u.email AS email,
       u.passwordHash AS passwordHash,
       u.role AS role,
       u.active AS active
     FROM Session s
     INNER JOIN User u ON u.id = s.userId
     WHERE s.tokenHash = ?
     LIMIT 1`,
    [hashToken(token)],
  );

  if (!session || sqliteDate(session.expiresAt) < new Date() || !Boolean(session.active)) {
    if (session) await sqliteExecute("DELETE FROM Session WHERE id = ?", [session.sessionId]);
    return null;
  }

  return rowToCurrentUser(session);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function verifyCredentials(username: string, password: string) {
  const user = await sqliteQueryOne<UserRow>(
    `SELECT id, name, username, email, passwordHash, role, active
     FROM User
     WHERE username = ?
     LIMIT 1`,
    [username],
  );
  if (!user || !Boolean(user.active)) return null;
  const ok = await compare(password, user.passwordHash);
  return ok ? rowToCurrentUser(user) : null;
}
