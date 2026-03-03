import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_session";
const LOGIN_PATH = "/admin/login";
const AUTH_API_PATH = "/api/admin/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through login page and auth endpoint without checking session
  if (pathname === LOGIN_PATH || pathname === AUTH_API_PATH) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET;
  const session = request.cookies.get(ADMIN_COOKIE)?.value;

  if (!secret || session !== secret) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
