import { NextResponse } from "next/server";
import { getSessionClaims } from "@radonsdk/auth/integrations/next";
import { auth } from "./app/lib/auth";

export function proxy(req: Request) {
  const claims = getSessionClaims(auth, req, { cookieName: "aced_session" });
  if (!claims) return NextResponse.redirect(new URL("/signin", req.url));
  return NextResponse.next();
}

// Protects all dashboard pages — API routes guard themselves via getCurrentUser.
export const config = { matcher: ["/dashboard/:path*"] };