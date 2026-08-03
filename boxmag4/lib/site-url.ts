import { getBackendBaseUrl as getClientSafeBackendBaseUrl } from "./backend-url";
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

/**
 * Backend API origin for server-side fetches (sitemap product URLs).
 * Prefers process env, then root .env, then client-safe helper rules.
 */
export function getBackendBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.BACKEND_PUBLIC_URL?.trim() ||
    readRootEnvValue("BACKEND_PUBLIC_URL") ||
    readRootEnvValue("NEXT_PUBLIC_BACKEND_URL");

  if (fromEnv) return trimTrailingSlash(fromEnv);
  return getClientSafeBackendBaseUrl();
}

/**
 * Backend URL for sitemap generation. Prefers Docker-internal hostname so
 * crawlers never depend on a cold external round-trip to api.boxmag.eu.
 */
export function getSitemapBackendBaseUrl(): string {
  const internal =
    process.env.SITEMAP_BACKEND_URL?.trim() ||
    process.env.BACKEND_INTERNAL_URL?.trim();

  if (internal) return trimTrailingSlash(internal);
  return getBackendBaseUrl();
}

export { getBackendBaseUrl as getPublicBackendBaseUrl } from "./backend-url";
