import { NextResponse } from "next/server";
import { getSessionClaims } from "@radonsdk/auth/integrations/next";
import { auth } from "./app/lib/auth";

export function middleware(req: Request) {
  const claims = getSessionClaims(auth, req);
  if (!claims) return NextResponse.redirect(new URL("/signin", req.url));
  return NextResponse.next();
}

// TODO(Radon Auth): restore "/dashboard/:path*" once real sessions are wired
export const config = { matcher: [] };