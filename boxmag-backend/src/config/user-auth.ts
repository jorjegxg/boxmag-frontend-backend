import crypto from "crypto";
import "./env";

export const USER_COOKIE_NAME = "boxmag-user-session";
const USER_COOKIE_SALT = "boxmag-user-v1";

/** HMAC secret for signed user session cookies. Falls back to ADMIN_PASSWORD in dev. */
export function getUserSessionSecret(): string | undefined {
  const dedicated = process.env.USER_SESSION_SECRET?.trim();
  if (dedicated) return dedicated;
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  return adminPassword || undefined;
}

export function getUserCookieDomain(): string | undefined {
  return process.env.ADMIN_COOKIE_DOMAIN?.trim() || undefined;
}

export function safeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${USER_COOKIE_SALT}:${payload}`)
    .digest("hex");
}

export type VerifiedUserSession = {
  userId: number;
  email: string;
};

export function createUserSessionToken(
  userId: number,
  email: string,
): string | null {
  const secret = getUserSessionSecret();
  if (!secret || !Number.isInteger(userId) || userId <= 0) return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const payload = `${userId}:${normalizedEmail}`;
  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyUserSessionToken(
  token: string | undefined,
): VerifiedUserSession | null {
  if (!token) return null;
  const secret = getUserSessionSecret();
  if (!secret) return null;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!payload || !signature) return null;

  const expectedSignature = signPayload(payload, secret);
  if (!safeEqualStrings(signature, expectedSignature)) return null;

  const colonIndex = payload.indexOf(":");
  if (colonIndex <= 0) return null;

  const userId = Number(payload.slice(0, colonIndex));
  const email = payload.slice(colonIndex + 1).trim().toLowerCase();
  if (!Number.isInteger(userId) || userId <= 0 || !email) return null;

  return { userId, email };
}

export function buildUserSessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  domain?: string;
} {
  const domain = getUserCookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
    ...(domain ? { domain } : {}),
  };
}
