import crypto from "crypto";
// Ensure the root .env is loaded (side effect) so ADMIN_PASSWORD / ADMIN_API_TOKEN
// are available when this module is used outside of the normal app bootstrap.
import "./env";

/**
 * Admin session cookie issued by the Next.js frontend (`/api/admin/auth`).
 * The backend validates the very same cookie so that direct API calls are
 * subject to the same admin gate as the UI.
 */
export const ADMIN_COOKIE_NAME = "boxmag-admin-session";
const ADMIN_COOKIE_SALT = "boxmag-admin-v1";

/** Server-side admin password (never exposed to the browser). */
export function getAdminPassword(): string | undefined {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value || undefined;
}

/**
 * Optional shared secret for server-to-server / scripted admin access via the
 * `Authorization: Bearer <token>` or `x-admin-token` header.
 */
export function getAdminApiToken(): string | undefined {
  const value = process.env.ADMIN_API_TOKEN?.trim();
  return value || undefined;
}

/**
 * Must produce the identical hex digest as the Next.js implementation in
 * `boxmag4/lib/admin-auth.ts` (WebCrypto SHA-256 over `salt:password`).
 */
export function createAdminSessionToken(password: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ADMIN_COOKIE_SALT}:${password}`)
    .digest("hex");
}

/** Constant-time string comparison to avoid leaking length/among timing. */
export function safeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function isAdminSessionValid(
  token: string | undefined,
  password: string | undefined,
): boolean {
  if (!token || !password) return false;
  return safeEqualStrings(token, createAdminSessionToken(password));
}
