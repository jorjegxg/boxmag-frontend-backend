export const ADMIN_COOKIE_NAME = "boxmag-admin-session";
const ADMIN_COOKIE_SALT = "boxmag-admin-v1";
/** Must match boxmag-backend/src/config/admin-auth.ts */
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function getAdminPassword(): string | undefined {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value || undefined;
}

export function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isAdminPublicRoute(pathname: string): boolean {
  return pathname === "/admin/login";
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Opaque expiring admin session: `v2.{exp}.{sha256(salt:password:v2.exp)}`.
 * Must match the Node implementation in boxmag-backend.
 */
export async function createAdminSessionToken(
  password: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const exp = nowSeconds + ADMIN_SESSION_TTL_SECONDS;
  const payload = `v2.${exp}`;
  const signature = await sha256Hex(
    `${ADMIN_COOKIE_SALT}:${password}:${payload}`,
  );
  return `${payload}.${signature}`;
}

export function safeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function isAdminSessionValid(
  token: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!token || !password) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v2") return false;

  const exp = Number(parts[1]);
  const signature = parts[2] ?? "";
  if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) >= exp) {
    return false;
  }

  const payload = `v2.${exp}`;
  const expected = await sha256Hex(
    `${ADMIN_COOKIE_SALT}:${password}:${payload}`,
  );
  return safeEqualStrings(signature, expected);
}
