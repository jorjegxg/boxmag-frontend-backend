/** Edge-safe CORS helpers (no Node fs/path — used by middleware). */

export const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3006",
  "https://boxmag.eu",
  "https://www.boxmag.eu",
];

export function parseCorsOrigins(raw: string | undefined): string[] {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === "*") return DEFAULT_CORS_ORIGINS;
  const parsed = trimmed
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_CORS_ORIGINS;
}

/** Full browser origins from CORS_ORIGIN (comma-separated), same as backend. */
export function getAllowedCorsOrigins(): string[] {
  return parseCorsOrigins(process.env.CORS_ORIGIN);
}

/** Hostnames for Next.js allowedDevOrigins (no scheme/port). */
export function originsToDevHosts(origins: string[]): string[] {
  const hosts = origins
    .map((origin) => {
      try {
        return new URL(origin).hostname;
      } catch {
        return null;
      }
    })
    .filter((host): host is string => Boolean(host));
  return [...new Set(["192.168.80.1", ...hosts])];
}

export function isAllowedCorsOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return getAllowedCorsOrigins().includes(origin);
}

export function applyCorsHeaders(
  target: Headers,
  origin: string | null,
): void {
  if (!isAllowedCorsOrigin(origin)) return;
  target.set("Access-Control-Allow-Origin", origin!);
  target.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  target.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  target.set("Vary", "Origin");
}
