import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), 303);
}

export function GET(request: Request) {
  return redirectTo(request, "/");
}

export async function POST(request: Request) {
  await destroySession();
  return redirectTo(request, "/login");
}
