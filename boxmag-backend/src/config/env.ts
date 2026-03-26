import dotenv from "dotenv";
import path from "path";

const rootEnvPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: rootEnvPath });

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  dbHost: process.env.DB_HOST ?? "localhost",
  dbPort: toNumber(process.env.DB_PORT, 3306),
  dbName: process.env.DB_NAME ?? "boxmag4",
  dbUser: process.env.DB_USER ?? "boxmag4",
  dbPassword: process.env.DB_PASSWORD ?? "change-me-user",
};

