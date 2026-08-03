import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  getAdminPassword,
  safeEqualStrings,
} from "../../../../lib/admin-auth";
import { consumeRateLimit } from "../../../../lib/rate-limit";

type AuthBody = {
  password?: string;
};

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  const rate = consumeRateLimit(`admin-auth:${clientKey(request)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, message: "Prea multe încercări. Încearcă din nou mai târziu." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const configuredPassword = getAdminPassword();
  if (!configuredPassword) {
    return NextResponse.json(
      { ok: false, message: "Parola de admin nu este configurată." },
      { status: 503 },
    );
  }

  let body: AuthBody;
  try {
    body = (await request.json()) as AuthBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Cerere invalidă." },
      { status: 400 },
    );
  }

  const submittedPassword = String(body.password ?? "");
  if (!safeEqualStrings(submittedPassword, configuredPassword)) {
    return NextResponse.json(
      { ok: false, message: "Parolă incorectă." },
      { status: 401 },
    );
  }

  const token = await createAdminSessionToken(configuredPassword);
  const response = NextResponse.json({ ok: true });
  // In production the admin panel (boxmag.eu) and the API (api.boxmag.eu) live
  // on different subdomains. Setting ADMIN_COOKIE_DOMAIN=boxmag.eu makes the
  // session cookie visible to the backend so it can enforce admin auth too.
  const cookieDomain = process.env.ADMIN_COOKIE_DOMAIN?.trim() || undefined;
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  return response;
}
