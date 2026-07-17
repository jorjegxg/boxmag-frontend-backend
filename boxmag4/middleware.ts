import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  getAdminPassword,
  isAdminPublicRoute,
  isAdminRoute,
  isAdminSessionValid,
} from "./lib/admin-auth";
import { applyCorsHeaders, isAllowedCorsOrigin } from "./lib/cors";

const LANG_COOKIE = "boxmag.language";

async function handleAdminAuth(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!isAdminRoute(pathname)) return null;

  const configuredPassword = getAdminPassword();
  const sessionToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAuthenticated = await isAdminSessionValid(
    sessionToken,
    configuredPassword,
  );

  if (isAdminPublicRoute(pathname)) {
    if (isAuthenticated) {
      const nextPath = request.nextUrl.searchParams.get("next");
      const redirectPath =
        nextPath && nextPath.startsWith("/admin") ? nextPath : "/admin";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    return null;
  }

  if (!configuredPassword) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("error", "config");
    return NextResponse.redirect(loginUrl);
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return null;
}

function handleApiCors(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return null;
  }

  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    if (!isAllowedCorsOrigin(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    const headers = new Headers();
    applyCorsHeaders(headers, origin);
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  applyCorsHeaders(response.headers, origin);
  return response;
}

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const apiCorsResponse = handleApiCors(request);
  if (apiCorsResponse) {
    return apiCorsResponse;
  }

  const adminAuthResponse = await handleAdminAuth(request);
  if (adminAuthResponse) {
    return adminAuthResponse;
  }

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
  const existingLang = request.cookies.get(LANG_COOKIE)?.value;
  if (existingLang !== "en" && existingLang !== "ro" && existingLang !== "de") {
    response.cookies.set(LANG_COOKIE, "en", { path: "/" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
