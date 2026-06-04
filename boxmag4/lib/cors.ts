import fs from "fs";
import path from "path";

export const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3006",
  "https://boxmag.eu",
  "https://www.boxmag.eu",
];

const rootEnvPath = path.resolve(process.cwd(), "../.env");

function readRootEnvValue(key: string): string | undefined {
  if (!fs.existsSync(rootEnvPath)) return undefined;
  const lines = fs.readFileSync(rootEnvPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;
    const currentKey = trimmed.slice(0, separatorIndex).trim();
    if (currentKey !== key) continue;
    return trimmed.slice(separatorIndex + 1).trim();
  }
  return undefined;
}

/** Full browser origins from CORS_ORIGIN (comma-separated), same as backend. */
export function getAllowedCorsOrigins(): string[] {
  const raw =
    process.env.CORS_ORIGIN?.trim() ?? readRootEnvValue("CORS_ORIGIN")?.trim();
  if (!raw || raw === "*") return DEFAULT_CORS_ORIGINS;
  const parsed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_CORS_ORIGINS;
}

/** Hostnames for Next.js allowedDevOrigins (no scheme/port). */
export function getAllowedDevHosts(): string[] {
  const hosts = getAllowedCorsOrigins()
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
