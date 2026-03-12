import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const AUTH_COOKIE_NAME = "qmc_auth";
// Only the login page and the auth endpoint are truly public.
// The snapshot endpoint uses its own bearer-token auth.
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/snapshot", "/api/hash"];

// Endpoints that need CORS (Vercel browser → MacBook via Tailscale Funnel)
const CORS_PATHS = ["/api/hash", "/api/snapshot"];

function isValidToken(token: string): boolean {
  // Token must be a 64-char hex string (sha256 output)
  return /^[a-f0-9]{64}$/.test(token);
}

function addCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin") || "*";
  const needsCors = CORS_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Handle CORS preflight for hash/snapshot endpoints
  if (needsCors && request.method === "OPTIONS") {
    return addCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  // Allow public paths (exact prefix match)
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const response = NextResponse.next();
    if (needsCors) addCorsHeaders(response, origin);
    return response;
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
