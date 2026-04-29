import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

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

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.80.1"],
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
    NEXT_PUBLIC_APP_ENV:
      process.env.NEXT_PUBLIC_APP_ENV ??
      readRootEnvValue("NODE_ENV") ??
      "development",
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
