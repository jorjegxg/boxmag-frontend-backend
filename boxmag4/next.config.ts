import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { originsToDevHosts, parseCorsOrigins } from "./lib/cors";

function readRootEnvValue(key: string): string | undefined {
  const rootEnvPath = path.resolve(process.cwd(), "../.env");
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

const corsOriginRaw =
  process.env.CORS_ORIGIN ?? readRootEnvValue("CORS_ORIGIN") ?? "";
const allowedCorsOrigins = parseCorsOrigins(corsOriginRaw);
const corsOriginEnv =
  corsOriginRaw.trim() || allowedCorsOrigins.join(",");

const nextConfig: NextConfig = {
  allowedDevOrigins: originsToDevHosts(allowedCorsOrigins),
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/**",
      },
    ],
  },
  env: {
    CORS_ORIGIN: corsOriginEnv,
    NEXT_PUBLIC_APP_ENV:
      process.env.NEXT_PUBLIC_APP_ENV ??
      readRootEnvValue("NODE_ENV") ??
      "development",
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
      readRootEnvValue("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY") ??
      readRootEnvValue("GOOGLE_MAPS_API_KEY") ??
      "",
    GOOGLE_MAPS_API_KEY:
      process.env.GOOGLE_MAPS_API_KEY ??
      readRootEnvValue("GOOGLE_MAPS_API_KEY") ??
      readRootEnvValue("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY") ??
      "",
    SMTP_HOST:
      process.env.SMTP_HOST ?? readRootEnvValue("SMTP_HOST") ?? "smtp.gmail.com",
    SMTP_PORT: process.env.SMTP_PORT ?? readRootEnvValue("SMTP_PORT") ?? "587",
    SMTP_USER: process.env.SMTP_USER ?? readRootEnvValue("SMTP_USER") ?? "",
    SMTP_PASS: process.env.SMTP_PASS ?? readRootEnvValue("SMTP_PASS") ?? "",
    EMAIL_FROM:
      process.env.EMAIL_FROM ?? readRootEnvValue("EMAIL_FROM") ?? "",
    CONTACT_TO:
      process.env.CONTACT_TO ?? readRootEnvValue("CONTACT_TO") ?? "",
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
