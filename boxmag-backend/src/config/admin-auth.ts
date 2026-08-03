import crypto from "crypto";
// Ensure the root .env is loaded (side effect) so ADMIN_PASSWORD / ADMIN_API_TOKEN
// are available when this module is used outside of the normal app bootstrap.
import "./env";

/**
 * Admin session cookie issued by the Next.js frontend (`/api/admin/auth`).
 * The backend validates the very same cookie so that direct API calls are
 * subject to the same admin gate as the UI.
 *
 * Token format: `v2.{expUnix}.{sha256Hex}` where the digest is over
 * `boxmag-admin-v1:password:v2.{exp}` (must match boxmag4/lib/admin-auth.ts).
 */
export const ADMIN_COOKIE_NAME = "boxmag-admin-session";
const ADMIN_COOKIE_SALT = "boxmag-admin-v1";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Server-side admin password (never exposed to the browser). */
export function getAdminPassword(): string | undefined {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value || undefined;
}

/**
 * Optional shared secret for server-to-server / scripted admin access via the
 * `Authorization: Bearer <token>` or the `x-admin-token` header.
 */
export function getAdminApiToken(): string | undefined {
  const value = process.env.ADMIN_API_TOKEN?.trim();
  return value || undefined;
}

function signAdminPayload(password: string, payload: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ADMIN_COOKIE_SALT}:${password}:${payload}`)
    .digest("hex");
}

/** Constant-time string comparison to avoid leaking length/among timing. */
export function safeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function createAdminSessionToken(
  password: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const exp = nowSeconds + ADMIN_SESSION_TTL_SECONDS;
  const payload = `v2.${exp}`;
  return `${payload}.${signAdminPayload(password, payload)}`;
}

export function isAdminSessionValid(
  token: string | undefined,
  password: string | undefined,
): boolean {
  if (!token || !password) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v2") return false;

  const exp = Number(parts[1]);
  const signature = parts[2] ?? "";
  if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) >= exp) {
    return false;
  }

  const payload = `v2.${exp}`;
  const expected = signAdminPayload(password, payload);
  return safeEqualStrings(signature, expected);
}
