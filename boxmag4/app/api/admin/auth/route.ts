import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminPassword,
  safeEqualStrings,
} from "../../../../lib/admin-auth";

type AuthBody = {
  password?: string;
};

export async function POST(request: Request) {
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
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
