export const ADMIN_COOKIE_NAME = "boxmag-admin-session";
const ADMIN_COOKIE_SALT = "boxmag-admin-v1";

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

export async function createAdminSessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${ADMIN_COOKIE_SALT}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
  const expected = await createAdminSessionToken(password);
  return safeEqualStrings(token, expected);
}
