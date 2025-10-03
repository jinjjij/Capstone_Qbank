export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

// 보호가 필요한 경로 패턴
const protectedPrefixes = ["/dashboard", "/settings"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needAuth = protectedPrefixes.some(p => pathname.startsWith(p));
  if (!needAuth) return NextResponse.next();

  const hasSession = req.cookies.get(COOKIE_NAME)?.value;
  if (!hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};