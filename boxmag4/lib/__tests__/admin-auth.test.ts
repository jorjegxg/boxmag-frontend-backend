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

  it("creates and validates v2 session tokens", async () => {
    const token = await createAdminSessionToken("secret-admin");
    expect(token.startsWith("v2.")).toBe(true);
    expect(await isAdminSessionValid(token, "secret-admin")).toBe(true);
    expect(await isAdminSessionValid(token, "wrong")).toBe(false);
  });

  it("exports cookie name used by middleware", () => {
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
});
