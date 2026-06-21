import { NextResponse } from "next/server";
import {
  createSessionRecord,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const user = await verifyCredentials(username, password);

  if (!user) {
    return redirectTo(request, "/login?error=1");
  }

  const { token, expiresAt } = await createSessionRecord(user.id);
  const response = redirectTo(request, "/");
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
