import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  getAdminPassword,
  safeEqualStrings,
} from "../../../../lib/admin-auth";
import { clearRateLimit, consumeRateLimit, getClientIp } from "../../../../lib/rate-limit";

type AuthBody = {
  password?: string;
};

function adminCookieOptions() {
  // In production the admin panel (boxmag.eu) and the API (api.boxmag.eu) live
  // on different subdomains. Setting ADMIN_COOKIE_DOMAIN=boxmag.eu makes the
  // session cookie visible to the backend so it can enforce admin auth too.
  const cookieDomain = process.env.ADMIN_COOKIE_DOMAIN?.trim() || undefined;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };
}

export async function POST(request: Request) {
  // Every attempt counts; a correct password clears the counter, so only
  // repeated failures (brute force) end up throttled.
  const rateKey = `admin-auth:${getClientIp(request)}`;
  const rate = consumeRateLimit(rateKey);
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

  clearRateLimit(rateKey);
  const token = await createAdminSessionToken(configuredPassword);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    ...adminCookieOptions(),
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  return response;
}

/** Admin logout: expire the session cookie (same domain/path it was set with). */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...adminCookieOptions(),
    maxAge: 0,
  });
  return response;
}
