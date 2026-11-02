import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  isAdminPublicRoute,
  isAdminRoute,
  isAdminSessionValid,
  safeEqualStrings,
} from "../admin-auth";

/** INV-AUTH-ADMIN — admin session helpers used by Next middleware + /api/admin/auth. */
describe("admin-auth helpers (INV-AUTH-ADMIN)", () => {
  it("detects admin routes", () => {
    expect(isAdminRoute("/admin")).toBe(true);
    expect(isAdminRoute("/admin/orders")).toBe(true);
    expect(isAdminRoute("/account")).toBe(false);
  });

  it("treats /admin/login as public admin route", () => {
    expect(isAdminPublicRoute("/admin/login")).toBe(true);
    expect(isAdminPublicRoute("/admin")).toBe(false);
  });

  it("safeEqualStrings is length-safe", () => {
    expect(safeEqualStrings("abc", "abc")).toBe(true);
    expect(safeEqualStrings("abc", "abd")).toBe(false);
    expect(safeEqualStrings("ab", "abc")).toBe(false);
  });

  it("creates and validates v3 (HMAC) session tokens", async () => {
    const token = await createAdminSessionToken("secret-admin");
    expect(token.startsWith("v3.")).toBe(true);
    expect(await isAdminSessionValid(token, "secret-admin")).toBe(true);
    expect(await isAdminSessionValid(token, "wrong")).toBe(false);
  });

  it("matches the backend token format (shared test vector)", async () => {
    // Same vector in boxmag-backend/src/__tests__/session-tokens.test.ts.
    expect(await createAdminSessionToken("secret-admin", 1_700_000_000)).toBe(
      "v3.1700604800.eb6758f38a588151f9bb760d4e08f8b25edfb4aa211ee27fec08e0e05e55597c",
    );
  });

  it("exports cookie name used by proxy", () => {
    expect(ADMIN_COOKIE_NAME).toBe("boxmag-admin-session");
  });
});

describe("POST /api/admin/auth (INV-AUTH-ADMIN)", () => {
  const ORIGINAL_PASSWORD = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "test-admin-password";
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_PASSWORD === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = ORIGINAL_PASSWORD;
    }
  });

  it("returns 503 when admin password is not configured", async () => {
    delete process.env.ADMIN_PASSWORD;
    vi.resetModules();
    const { POST } = await import("../../app/api/admin/auth/route");
    const response = await POST(
      new Request("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": "10.0.0.1" },
        body: JSON.stringify({ password: "anything" }),
      }),
    );
    expect(response.status).toBe(503);
  });

  it("returns 401 for wrong password", async () => {
    const { POST } = await import("../../app/api/admin/auth/route");
    const response = await POST(
      new Request("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": "10.0.0.2" },
        body: JSON.stringify({ password: "wrong" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("sets admin cookie on success", async () => {
    const { POST } = await import("../../app/api/admin/auth/route");
    const response = await POST(
      new Request("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": "10.0.0.3" },
        body: JSON.stringify({ password: "test-admin-password" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(ADMIN_COOKIE_NAME);
  });

  it("DELETE clears the admin cookie (logout)", async () => {
    const { DELETE } = await import("../../app/api/admin/auth/route");
    const response = await DELETE();
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ADMIN_COOKIE_NAME}=;`);
    expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=thu, 01 jan 1970/);
  });

  it("throttles repeated failures but never a correct password", async () => {
    const { POST } = await import("../../app/api/admin/auth/route");
    const attempt = (password: string) =>
      POST(
        new Request("http://localhost/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-real-ip": "10.0.0.9" },
          body: JSON.stringify({ password }),
        }),
      );
    for (let i = 0; i < 25; i += 1) {
      expect((await attempt("test-admin-password")).status).toBe(200);
    }
    for (let i = 0; i < 20; i += 1) {
      expect((await attempt("wrong")).status).toBe(401);
    }
    expect((await attempt("wrong")).status).toBe(429);
  });
});
