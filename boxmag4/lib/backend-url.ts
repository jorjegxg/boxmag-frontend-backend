/**
 * Client- and server-safe backend API origin.
 * Production builds must set NEXT_PUBLIC_BACKEND_URL (no localhost fallback).
 */

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isProductionAppEnv(): boolean {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() ?? "";
  return process.env.NODE_ENV === "production" || appEnv === "production";
}

/** Backend API origin for browser and server fetches. */
export function getBackendBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.BACKEND_PUBLIC_URL?.trim();

  if (fromEnv) return trimTrailingSlash(fromEnv);

  if (isProductionAppEnv()) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL (or BACKEND_PUBLIC_URL) is required when NODE_ENV or NEXT_PUBLIC_APP_ENV is production",
    );
  }

  return "http://localhost:3005";
}
