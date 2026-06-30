import { readRootEnvValue } from "./root-env";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/** Canonical public site origin (sitemap, robots, metadata). */
export function getSiteBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_BASE_URL?.trim() ||
    readRootEnvValue("FRONTEND_BASE_URL");

  if (fromEnv) return trimTrailingSlash(fromEnv);
  if (process.env.NODE_ENV === "production") return "https://boxmag.eu";
  return "http://localhost:3006";
}

/** Backend API origin for server-side fetches (sitemap product URLs). */
export function getBackendBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.BACKEND_PUBLIC_URL?.trim() ||
    readRootEnvValue("BACKEND_PUBLIC_URL");

  if (fromEnv) return trimTrailingSlash(fromEnv);
  return "http://localhost:3005";
}
