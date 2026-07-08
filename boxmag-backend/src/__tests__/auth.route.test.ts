import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserSessionToken } from "../config/user-auth";
import { USER_COOKIE_NAME } from "../config/user-auth";

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    execute: executeMock,
  },
}));

vi.mock("../services/email", () => ({
  isEmailTransportConfigured: vi.fn(() => true),
  sendVerificationEmail: vi.fn(async () => undefined),
}));

import { app } from "../app";

const USER_EMAIL = "customer@example.com";

function userCookie(userId = 42): string {
  process.env.USER_SESSION_SECRET = "test-user-session-secret";
  const token = createUserSessionToken(userId, USER_EMAIL);
  if (!token) throw new Error("Failed to create user session token");
  return `${USER_COOKIE_NAME}=${token}`;
}

describe("auth routes", () => {
  beforeEach(() => {
    executeMock.mockReset();
    process.env.USER_SESSION_SECRET = "test-user-session-secret";
    process.env.ADMIN_PASSWORD = "test-admin-password";
  });

  it("returns 400 when login payload is missing", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("required");
  });

  it("returns 400 when verify-email token is missing", async () => {
    const response = await request(app).get("/api/auth/verify-email");

    expect(response.status).toBe(400);
    expect(response.text).toContain("Invalid verification link");
  });

  it("returns 400 when register payload is invalid", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "customer@example.com",
      password: "123",
      firstName: "Jane",
      surname: "Doe",
      acceptRegulations: false,
    });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid registration payload");
  });

  it("returns 401 when profile update is not authenticated", async () => {
    const response = await request(app).put("/api/auth/profile").send({
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("returns 404 when profile update user is not found", async () => {
    executeMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .put("/api/auth/profile")
      .set("Cookie", userCookie())
      .send({
        firstName: "Jane",
        lastName: "Doe",
        phone: "+40700000000",
      });

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("User not found");
  });

  it("updates profile when user exists", async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 42 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .put("/api/auth/profile")
      .set("Cookie", userCookie())
      .send({
        firstName: "Jane",
        lastName: "Doe",
        phone: "+40700000000",
        companyName: "Boxmag SRL",
        vatNumber: "RO12345678",
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({
      email: "customer@example.com",
      firstName: "Jane",
      lastName: "Doe",
      phone: "+40700000000",
      companyName: "Boxmag SRL",
      vatNumber: "RO12345678",
    });
    expect(executeMock).toHaveBeenCalledTimes(2);
  });
});
