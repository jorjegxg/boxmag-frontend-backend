import dotenv from "dotenv";
import path from "path";

const rootEnvPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: rootEnvPath });

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** Comma-separated list in CORS_ORIGIN, or "*" for all origins (dev only). */
function parseCorsOrigins(value: string | undefined): string[] | "*" {
  const raw = (value ?? "*").trim();
  if (!raw || raw === "*") return "*";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isWeakSecret(value: string | undefined): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return true;
  return /^change-me/i.test(trimmed);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeLocalhost(value: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(value);
}

export type ProductionEnvSnapshot = {
  nodeEnv?: string;
  corsOrigin?: string;
  dbPassword?: string;
  minioRootPassword?: string;
  adminPassword?: string;
  userSessionSecret?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripeSuccessUrl?: string;
  stripeCancelUrl?: string;
  frontendBaseUrl?: string;
  backendPublicUrl?: string;
};

/**
 * Fail-closed production checks. Safe to call in any env — no-ops unless
 * NODE_ENV=production. Throws with a multi-line message listing every failure.
 */
export function assertProductionEnv(snapshot: ProductionEnvSnapshot = {}): void {
  const nodeEnv = snapshot.nodeEnv ?? process.env.NODE_ENV ?? "development";
  if (nodeEnv !== "production") return;

  const corsOrigin = snapshot.corsOrigin ?? process.env.CORS_ORIGIN;
  const dbPassword = snapshot.dbPassword ?? process.env.DB_PASSWORD;
  const minioRootPassword =
    snapshot.minioRootPassword ?? process.env.MINIO_ROOT_PASSWORD;
  const adminPassword = snapshot.adminPassword ?? process.env.ADMIN_PASSWORD;
  const userSessionSecret =
    snapshot.userSessionSecret ?? process.env.USER_SESSION_SECRET;
  const stripeSecretKey =
    snapshot.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY ?? "";
  const stripeWebhookSecret =
    snapshot.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const stripeSuccessUrl =
    snapshot.stripeSuccessUrl ?? process.env.STRIPE_SUCCESS_URL ?? "";
  const stripeCancelUrl =
    snapshot.stripeCancelUrl ?? process.env.STRIPE_CANCEL_URL ?? "";
  const frontendBaseUrl =
    snapshot.frontendBaseUrl ?? process.env.FRONTEND_BASE_URL ?? "";
  const backendPublicUrl =
    snapshot.backendPublicUrl ?? process.env.BACKEND_PUBLIC_URL ?? "";

  const errors: string[] = [];

  const corsRaw = (corsOrigin ?? "").trim();
  if (!corsRaw || corsRaw === "*") {
    errors.push("CORS_ORIGIN must be an explicit comma-separated origin list (not empty or *)");
  }

  if (isWeakSecret(dbPassword)) {
    errors.push("DB_PASSWORD must be set and must not use a change-me-* default");
  }
  if (isWeakSecret(minioRootPassword)) {
    errors.push(
      "MINIO_ROOT_PASSWORD must be set and must not use a change-me-* default",
    );
  }
  if (isWeakSecret(adminPassword)) {
    errors.push(
      "ADMIN_PASSWORD must be set and must not use a change-me-* default",
    );
  }
  if (!(userSessionSecret ?? "").trim()) {
    errors.push(
      "USER_SESSION_SECRET is required in production (do not fall back to ADMIN_PASSWORD)",
    );
  }

  if (!stripeSecretKey.startsWith("sk_live_")) {
    errors.push("STRIPE_SECRET_KEY must be a live key (sk_live_…)");
  }
  if (!(stripeWebhookSecret ?? "").trim()) {
    errors.push("STRIPE_WEBHOOK_SECRET must be set");
  }
  if (!isHttpsUrl(stripeSuccessUrl)) {
    errors.push("STRIPE_SUCCESS_URL must be an https:// URL");
  }
  if (!isHttpsUrl(stripeCancelUrl)) {
    errors.push("STRIPE_CANCEL_URL must be an https:// URL");
  }

  if (!isHttpsUrl(frontendBaseUrl) || looksLikeLocalhost(frontendBaseUrl)) {
    errors.push("FRONTEND_BASE_URL must be a public https:// URL (no localhost)");
  }
  if (!isHttpsUrl(backendPublicUrl) || looksLikeLocalhost(backendPublicUrl)) {
    errors.push("BACKEND_PUBLIC_URL must be a public https:// URL (no localhost)");
  }

  if (errors.length > 0) {
    throw new Error(
      `Production env validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 4000),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  frontendBaseUrl: process.env.FRONTEND_BASE_URL ?? "http://localhost:3006",
  backendPublicUrl:
    process.env.BACKEND_PUBLIC_URL ??
    `http://localhost:${toNumber(process.env.PORT, 4000)}`,
  taxPercent: toNumber(process.env.TAX_PERCENT, 21),
  dbHost: process.env.DB_HOST ?? "localhost",
  dbPort: toNumber(process.env.DB_PORT, 3306),
  dbName: process.env.DB_NAME ?? "boxmag4",
  dbUser: process.env.DB_USER ?? "boxmag4",
  dbPassword: process.env.DB_PASSWORD ?? "change-me-user",
  smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "",
  contactTo: process.env.CONTACT_TO ?? "",
  emailOrdersFrom: process.env.EMAIL_ORDERS_FROM ?? "",
  emailOrdersSmtpUser: process.env.EMAIL_ORDERS_SMTP_USER ?? "",
  emailOrdersSmtpPass: process.env.EMAIL_ORDERS_SMTP_PASS ?? "",
  emailB2bSmtpUser: process.env.EMAIL_B2B_SMTP_USER ?? "",
  emailB2bSmtpPass: process.env.EMAIL_B2B_SMTP_PASS ?? "",
  ordersNotificationTo: process.env.ORDERS_NOTIFICATION_TO ?? "",
  /** Default offer email sender key: orders | info | b2b */
  emailOfferDefaultFromKey: process.env.EMAIL_OFFER_DEFAULT_FROM_KEY ?? "orders",
  infoEmail: process.env.NEXT_PUBLIC_INFO_EMAIL ?? "",
  b2bEmail: process.env.NEXT_PUBLIC_B2B_EMAIL ?? "",
  verificationExpiresMinutes: toNumber(process.env.VERIFICATION_EXPIRES_MINUTES, 60),
  minioEndpoint: process.env.MINIO_ENDPOINT ?? "localhost",
  minioPort: toNumber(process.env.MINIO_PORT_API, 9000),
  minioUseSSL: process.env.MINIO_USE_SSL === "true",
  minioAccessKey: process.env.MINIO_ROOT_USER ?? "boxmagadmin",
  minioSecretKey: process.env.MINIO_ROOT_PASSWORD ?? "change-me-minio-password",
  minioBucketName: process.env.MINIO_BUCKET_NAME ?? "boxmag4-images",
  minioPublicBaseUrl:
    process.env.MINIO_PUBLIC_BASE_URL ??
    `http://localhost:${toNumber(process.env.MINIO_PORT_API, 9000)}`,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripeCurrency: (process.env.STRIPE_CURRENCY ?? "eur").toLowerCase(),
  stripeSuccessUrl:
    process.env.STRIPE_SUCCESS_URL ??
    `${process.env.FRONTEND_BASE_URL ?? "http://localhost:3006"}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  stripeCancelUrl:
    process.env.STRIPE_CANCEL_URL ??
    `${process.env.FRONTEND_BASE_URL ?? "http://localhost:3006"}/checkout/cancel`,
};
