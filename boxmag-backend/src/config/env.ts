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
  taxPercent: toNumber(process.env.TAX_PERCENT, 21),
  dbHost: process.env.DB_HOST ?? "localhost",
  dbPort: toNumber(process.env.DB_PORT, 3306),
  dbName: process.env.DB_NAME ?? "boxmag4",
  dbUser: process.env.DB_USER ?? "boxmag4",
  dbPassword: process.env.DB_PASSWORD ?? "change-me-user",
  minioEndpoint: process.env.MINIO_ENDPOINT ?? "localhost",
  minioPort: toNumber(process.env.MINIO_PORT_API, 9000),
  minioUseSSL: process.env.MINIO_USE_SSL === "true",
  minioAccessKey: process.env.MINIO_ROOT_USER ?? "boxmagadmin",
  minioSecretKey: process.env.MINIO_ROOT_PASSWORD ?? "change-me-minio-password",
  minioBucketName: process.env.MINIO_BUCKET_NAME ?? "boxmag4-images",
  minioPublicBaseUrl:
    process.env.MINIO_PUBLIC_BASE_URL ??
    `http://localhost:${toNumber(process.env.MINIO_PORT_API, 9000)}`,
};

