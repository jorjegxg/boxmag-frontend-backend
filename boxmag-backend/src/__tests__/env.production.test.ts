import { describe, expect, it } from "vitest";
import {
  assertProductionEnv,
  type ProductionEnvSnapshot,
} from "../config/env";

const validProd: ProductionEnvSnapshot = {
  nodeEnv: "production",
  corsOrigin: "https://boxmag.eu,https://www.boxmag.eu",
  dbPassword: "strong-db-password",
  minioRootPassword: "strong-minio-password",
  adminPassword: "strong-admin-password",
  userSessionSecret: "strong-user-session-secret",
  stripeSecretKey: "sk_live_testkey",
  stripeWebhookSecret: "whsec_test",
  stripeSuccessUrl:
    "https://boxmag.eu/checkout/success?session_id={CHECKOUT_SESSION_ID}",
  stripeCancelUrl: "https://boxmag.eu/checkout/cancel",
  frontendBaseUrl: "https://boxmag.eu",
  backendPublicUrl: "https://api.boxmag.eu",
};

describe("assertProductionEnv", () => {
  it("no-ops when not production", () => {
    expect(() =>
      assertProductionEnv({
        nodeEnv: "development",
        corsOrigin: "*",
        dbPassword: "change-me-user",
      }),
    ).not.toThrow();
  });

  it("accepts a complete production snapshot", () => {
    expect(() => assertProductionEnv(validProd)).not.toThrow();
  });

  it("rejects CORS_ORIGIN *", () => {
    expect(() =>
      assertProductionEnv({ ...validProd, corsOrigin: "*" }),
    ).toThrow(/CORS_ORIGIN/);
  });

  it("rejects change-me DB password", () => {
    expect(() =>
      assertProductionEnv({ ...validProd, dbPassword: "change-me-user" }),
    ).toThrow(/DB_PASSWORD/);
  });

  it("rejects Stripe test key without STRIPE_ALLOW_TEST_KEYS", () => {
    expect(() =>
      assertProductionEnv({ ...validProd, stripeSecretKey: "sk_test_x" }),
    ).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("accepts Stripe test key when STRIPE_ALLOW_TEST_KEYS is set", () => {
    expect(() =>
      assertProductionEnv({
        ...validProd,
        stripeSecretKey: "sk_test_x",
        stripeAllowTestKeys: "1",
      }),
    ).not.toThrow();
  });

  it("rejects localhost public URLs", () => {
    expect(() =>
      assertProductionEnv({
        ...validProd,
        frontendBaseUrl: "http://localhost:3006",
      }),
    ).toThrow(/FRONTEND_BASE_URL/);
  });

  it("rejects missing USER_SESSION_SECRET", () => {
    expect(() =>
      assertProductionEnv({ ...validProd, userSessionSecret: "" }),
    ).toThrow(/USER_SESSION_SECRET/);
  });
});
