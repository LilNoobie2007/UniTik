/**
 * UniTik Edge Middleware
 *
 * 1. Logs incoming route transitions with high-precision ISO timestamps.
 * 2. Injects strict HTTP security headers (Clickjacking, MIME-sniffing, Referrer).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const { pathname } = request.nextUrl;

  // Log non-static asset requests to the terminal with timestamps
  if (!pathname.startsWith("/_next") && !pathname.includes(".")) {
    console.log(`[${timestamp}] [ROUTE] ${request.method} -> ${pathname}`);
  }

  const response = NextResponse.next();

  // Enforce Zero-Trust browser security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: "/:path*",
};