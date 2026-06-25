import { NextRequest, NextResponse } from "next/server";
import { accessCookieName } from "@/lib/auth-cookies";

export function middleware(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/login";
  const hasAccessCookie = request.cookies.has(accessCookieName);

  if (!isLogin && !hasAccessCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
 
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
