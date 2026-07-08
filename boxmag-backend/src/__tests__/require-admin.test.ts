import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from "../config/admin-auth";
import { USER_COOKIE_NAME, createUserSessionToken } from "../config/user-auth";

const { queryMock, executeMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  executeMock: vi.fn(),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    query: queryMock,
    execute: executeMock,
  },
}));

import { app } from "../app";

const ADMIN_PASSWORD = "test-admin-password";
const USER_EMAIL = "customer@example.com";

function adminCookie(): string {
  return `${ADMIN_COOKIE_NAME}=${createAdminSessionToken(ADMIN_PASSWORD)}`;
}

function userCookie(userId = 7): string {
  const token = createUserSessionToken(userId, USER_EMAIL);
  if (!token) throw new Error("Failed to create user session token");
  return `${USER_COOKIE_NAME}=${token}`;
}

describe("admin authentication", () => {
  beforeEach(() => {
    queryMock.mockReset();
    executeMock.mockReset();
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
    process.env.USER_SESSION_SECRET = "test-user-session-secret";
  });

  it("blocks listing all orders without admin auth", async () => {
    const response = await request(app).get("/api/orders");

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Admin authentication required");
  });

  it("allows listing all orders with a valid admin session cookie", async () => {
    queryMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .get("/api/orders")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("allows listing orders scoped by email with a matching user session", async () => {
    queryMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .get("/api/orders")
      .query({ email: USER_EMAIL })
      .set("Cookie", userCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("blocks order status updates without admin auth", async () => {
    const response = await request(app)
      .patch("/api/orders/12/status")
      .send({ status: "completed" });

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("blocks inactive shipping methods without admin auth", async () => {
    const response = await request(app).get(
      "/api/shipping-methods?includeInactive=true",
    );

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("accepts admin API token via Authorization header", async () => {
    process.env.ADMIN_API_TOKEN = "server-token";
    queryMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .get("/api/orders")
      .set("Authorization", "Bearer server-token");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});
