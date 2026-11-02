import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  createAdminSessionToken,
  isAdminSessionValid,
} from "../config/admin-auth";
import {
  createUserSessionToken,
  verifyUserSessionToken,
} from "../config/user-auth";

describe("admin session tokens", () => {
  const password = "test-admin-password";

  it("accepts a fresh v3 (HMAC) token", () => {
    const token = createAdminSessionToken(password);
    expect(token.startsWith("v3.")).toBe(true);
    expect(isAdminSessionValid(token, password)).toBe(true);
  });

  it("matches the frontend token format (shared test vector)", () => {
    // Same vector in boxmag4/lib/__tests__/admin-auth.test.ts.
    expect(createAdminSessionToken("secret-admin", 1_700_000_000)).toBe(
      "v3.1700604800.eb6758f38a588151f9bb760d4e08f8b25edfb4aa211ee27fec08e0e05e55597c",
    );
  });

  it("rejects a wrong password", () => {
    const token = createAdminSessionToken(password);
    expect(isAdminSessionValid(token, "other")).toBe(false);
  });

  it("rejects an expired token", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createAdminSessionToken(password, now - 60 * 60 * 24 * 8);
    expect(isAdminSessionValid(token, password)).toBe(false);
  });

  it("rejects legacy deterministic password hashes", () => {
    const legacy =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(isAdminSessionValid(legacy, password)).toBe(false);
  });
});

describe("user session tokens", () => {
  const prevSecret = process.env.USER_SESSION_SECRET;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.USER_SESSION_SECRET = "test-user-session-secret";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env.USER_SESSION_SECRET = prevSecret;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it("creates and verifies a token with embedded exp", () => {
    const token = createUserSessionToken(7, "Buyer@Example.com");
    expect(token).toBeTruthy();
    expect(verifyUserSessionToken(token!)).toEqual({
      userId: 7,
      email: "buyer@example.com",
    });
  });

  it("rejects an expired user token", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createUserSessionToken(7, "buyer@example.com", now - 60 * 60 * 24 * 15);
    expect(token).toBeTruthy();
    expect(verifyUserSessionToken(token!)).toBeNull();
  });

  it("does not fall back to ADMIN_PASSWORD in production", () => {
    delete process.env.USER_SESSION_SECRET;
    process.env.ADMIN_PASSWORD = "admin-only";
    process.env.NODE_ENV = "production";
    expect(createUserSessionToken(7, "buyer@example.com")).toBeNull();
  });
});
