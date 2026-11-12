import crypto from "crypto";
import "./env";

export const USER_COOKIE_NAME = "boxmag-user-session";
const USER_COOKIE_SALT = "boxmag-user-v1";
/** Embedded token TTL (must stay ≤ cookie maxAge). */
export const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

/**
 * HMAC secret for signed user session cookies.
 * Production requires USER_SESSION_SECRET (no ADMIN_PASSWORD fallback).
 */
export function getUserSessionSecret(): string | undefined {
  const dedicated = process.env.USER_SESSION_SECRET?.trim();
  if (dedicated) return dedicated;
  if (process.env.NODE_ENV === "production") return undefined;
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

/**
 * The signature also covers a "credential stamp" derived from the user's
 * current password hash (see services/user-credential-stamp.ts). Changing the
 * password changes the stamp, which invalidates every session issued before.
 */
function signPayload(
  payload: string,
  secret: string,
  credentialStamp: string,
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${USER_COOKIE_SALT}:${payload}:${credentialStamp}`)
    .digest("hex");
}

/** Stamp for a stored password hash; opaque, never sent to the client. */
export function credentialStampFromPasswordHash(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex");
}

export type VerifiedUserSession = {
  userId: number;
  email: string;
};

export function createUserSessionToken(
  userId: number,
  email: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  credentialStamp: string = "",
): string | null {
  const secret = getUserSessionSecret();
  if (!secret || !Number.isInteger(userId) || userId <= 0) return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const exp = nowSeconds + USER_SESSION_TTL_SECONDS;
  const payload = `${userId}:${normalizedEmail}:${exp}`;
  return `${payload}.${signPayload(payload, secret, credentialStamp)}`;
}

type ParsedUserSessionToken = VerifiedUserSession & {
  payload: string;
  signature: string;
};

function parseUserSessionToken(
  token: string | undefined,
): ParsedUserSessionToken | null {
  if (!token) return null;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!payload || !signature) return null;

  const lastColon = payload.lastIndexOf(":");
  if (lastColon <= 0) return null;

  const exp = Number(payload.slice(lastColon + 1));
  if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) >= exp) {
    return null;
  }

  const withoutExp = payload.slice(0, lastColon);
  const firstColon = withoutExp.indexOf(":");
  if (firstColon <= 0) return null;

  const userId = Number(withoutExp.slice(0, firstColon));
  const email = withoutExp.slice(firstColon + 1).trim().toLowerCase();
  if (!Number.isInteger(userId) || userId <= 0 || !email) return null;

  return { userId, email, payload, signature };
}

/**
 * UNVERIFIED user id claimed by a token — only for looking up the credential
 * stamp needed to verify it. Never use it for authorization.
 */
export function peekUserSessionUserId(token: string | undefined): number | null {
  return parseUserSessionToken(token)?.userId ?? null;
}

export function verifyUserSessionToken(
  token: string | undefined,
  credentialStamp: string = "",
): VerifiedUserSession | null {
  const secret = getUserSessionSecret();
  if (!secret) return null;

  const parsed = parseUserSessionToken(token);
  if (!parsed) return null;

  const expectedSignature = signPayload(
    parsed.payload,
    secret,
    credentialStamp,
  );
  if (!safeEqualStrings(parsed.signature, expectedSignature)) return null;

  return { userId: parsed.userId, email: parsed.email };
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
    maxAge: USER_SESSION_TTL_SECONDS * 1000,
    ...(domain ? { domain } : {}),
  };
}
