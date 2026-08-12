import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_USER_EMAIL,
  adminCookie,
  ensureTestAuthEnv,
  userCookie,
} from "./test-helpers";

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

describe("admin authentication", () => {
  beforeEach(() => {
    queryMock.mockReset();
    executeMock.mockReset();
    ensureTestAuthEnv();
    delete process.env.ADMIN_API_TOKEN;
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
      .query({ email: TEST_USER_EMAIL })
      .set("Cookie", userCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("blocks email-scoped orders when user email does not match (INV-AUTH-EMAIL-SCOPE)", async () => {
    const response = await request(app)
      .get("/api/orders")
      .query({ email: "other@example.com" })
      .set("Cookie", userCookie(7, TEST_USER_EMAIL));

    expect(response.status).toBe(401);
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

  it("accepts admin API token via x-admin-token header (INV-AUTH-ADMIN)", async () => {
    process.env.ADMIN_API_TOKEN = "server-token";
    queryMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .get("/api/orders")
      .set("x-admin-token", "server-token");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("returns 503 when admin password and API token are not configured (INV-AUTH-ADMIN)", async () => {
    process.env.ADMIN_PASSWORD = "";
    process.env.ADMIN_API_TOKEN = "";

    const response = await request(app).get("/api/orders/offer-senders");

    expect(response.status).toBe(503);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("not configured");
  });
});
