import { NextRequest, NextResponse } from "next/server";

const LANG_COOKIE = "boxmag.language";

function isStaticPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/svgs") ||
    pathname.startsWith("/pictures") ||
    pathname.startsWith("/placeholders") ||
    pathname.includes(".")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/ro" || pathname.startsWith("/ro/")) {
    const internalPath = pathname === "/ro" ? "/" : pathname.slice(3) || "/";
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    const response = NextResponse.redirect(url);
    response.cookies.set(LANG_COOKIE, "ro", { path: "/" });
    return response;
  }

  if (pathname === "/de" || pathname.startsWith("/de/")) {
    const internalPath = pathname === "/de" ? "/" : pathname.slice(3) || "/";
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    const response = NextResponse.redirect(url);
    response.cookies.set(LANG_COOKIE, "de", { path: "/" });
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set(LANG_COOKIE, "en", { path: "/" });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
