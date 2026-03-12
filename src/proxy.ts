import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const AUTH_COOKIE_NAME = "qmc_auth";
// Only the login page and the auth endpoint are truly public.
// The snapshot endpoint uses its own bearer-token auth.
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/snapshot", "/api/hash"];

function isValidToken(token: string): boolean {
  // Token must be a 64-char hex string (sha256 output)
  return /^[a-f0-9]{64}$/.test(token);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths (exact prefix match)
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Check auth cookie — validate token format, not just existence
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  if (!authCookie?.value || !isValidToken(authCookie.value)) {
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Redirect pages to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
