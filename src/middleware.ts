export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

// 공개 경로 (인증 불필요)
const publicPaths = ["/login", "/signup"];

// 보호된 경로 (인증 필요)
const protectedPaths = ["/main", "/solve", "/profile", "/setting", "/library", "/book"];

// 개발 전용 경로
const devOnlyPaths = ["/backEndTest"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 개발 환경에서 인증 바이패스
  const skipAuth = process.env.SKIP_AUTH_IN_DEV === "true";
  if (skipAuth) {
    // 루트 경로는 /main으로 리다이렉트
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/main", req.url));
    }
    return NextResponse.next();
  }

  // API 경로는 각 route handler에서 처리
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 정적 파일 및 Next.js 내부 경로
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.get(COOKIE_NAME)?.value;

  // 개발 전용 경로 체크 (프로덕션에서는 404)
  if (devOnlyPaths.some(path => pathname.startsWith(path))) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.redirect(new URL("/main", req.url));
    }
    return NextResponse.next();
  }

  // 루트 경로 처리
  if (pathname === "/") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/main", req.url));
    } else {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // 공개 경로는 세션 있으면 /main으로 리다이렉트
  if (publicPaths.some(path => pathname.startsWith(path))) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/main", req.url));
    }
    return NextResponse.next();
  }

  // 보호된 경로는 세션 필요
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    if (!hasSession) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health check)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};