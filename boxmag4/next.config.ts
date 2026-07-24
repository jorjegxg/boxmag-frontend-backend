import type { NextConfig } from "next";
import { originsToDevHosts, parseCorsOrigins } from "./lib/cors";
import { readRootEnvValue } from "./lib/root-env";

function envFromRoot(key: string, fallback = ""): string {
  return process.env[key] ?? readRootEnvValue(key) ?? fallback;
}

if (!process.env.ADMIN_PASSWORD) {
  const adminPassword = readRootEnvValue("ADMIN_PASSWORD");
  if (adminPassword) {
    process.env.ADMIN_PASSWORD = adminPassword;
  }
}

const corsOriginRaw =
  process.env.CORS_ORIGIN ?? readRootEnvValue("CORS_ORIGIN") ?? "";
const allowedCorsOrigins = parseCorsOrigins(corsOriginRaw);
const corsOriginEnv =
  corsOriginRaw.trim() || allowedCorsOrigins.join(",");

const nextConfig: NextConfig = {
  allowedDevOrigins: originsToDevHosts(allowedCorsOrigins),
  images: {
    // Prefer serving CDN assets directly (see ProductCard). Local public/ assets
    // still use the optimizer; keep remotePatterns for any remaining next/image usage.
    dangerouslyAllowLocalIP: true,
    minimumCacheTTL: 60 * 60 * 24,
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
      {
        protocol: "https",
        hostname: "cdn.boxmag.eu",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.boxmag.eu",
        pathname: "/**",
      },
    ],
  },
  env: {
    CORS_ORIGIN: corsOriginEnv,
    NEXT_PUBLIC_APP_ENV:
      process.env.NEXT_PUBLIC_APP_ENV ??
      readRootEnvValue("NEXT_PUBLIC_APP_ENV") ??
      (process.env.NODE_ENV === "production" ? "production" : "development"),
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
    CONTACT_TO: envFromRoot("CONTACT_TO"),
    NEXT_PUBLIC_INFO_EMAIL: envFromRoot("NEXT_PUBLIC_INFO_EMAIL"),
    NEXT_PUBLIC_B2B_EMAIL: envFromRoot("NEXT_PUBLIC_B2B_EMAIL"),
    NEXT_PUBLIC_ORDERS_EMAIL:
      envFromRoot("NEXT_PUBLIC_ORDERS_EMAIL") ||
      envFromRoot("EMAIL_ORDERS_FROM"),
    DEV_DEMO_CUSTOMER_EMAIL: envFromRoot("DEV_DEMO_CUSTOMER_EMAIL"),
    DEV_AUTOFILL_EMAIL: envFromRoot("DEV_AUTOFILL_EMAIL"),
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
