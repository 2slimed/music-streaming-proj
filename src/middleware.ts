import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware – protects private API routes by checking for a valid session token.
 *
 * Public routes (no auth required):
 *   - /api/auth/**        – NextAuth handlers
 *   - /api/tracks (GET)   – browsing the catalogue
 *   - /api/search (GET)   – searching
 *
 * All other /api/** routes require a session cookie.
 * Pages are NOT blocked here; auth checks happen at the component level.
 */

const PUBLIC_API_PREFIXES = ["/api/auth"];

const PUBLIC_API_ROUTES: { path: string; methods: string[] }[] = [
  { path: "/api/tracks", methods: ["GET"] },
  { path: "/api/search", methods: ["GET"] },
];

function isPublicApiRoute(pathname: string, method: string): boolean {
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;

  for (const route of PUBLIC_API_ROUTES) {
    if (pathname === route.path && route.methods.includes(method)) return true;
    // allow GET on /api/tracks/:id (single track detail)
    if (
      method === "GET" &&
      route.path === "/api/tracks" &&
      pathname.startsWith("/api/tracks/") &&
      !pathname.includes("/stream")
    ) {
      return true;
    }
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to /api routes
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (isPublicApiRoute(pathname, request.method)) {
    return NextResponse.next();
  }

  // Check for session token (set by NextAuth)
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token") ??
    request.cookies.get("authjs.session-token");

  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
