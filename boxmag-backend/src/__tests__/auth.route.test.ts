import request from "supertest";
import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_COOKIE_NAME } from "../config/user-auth";
import {
  TEST_USER_EMAIL,
  ensureTestAuthEnv,
  userCookie,
} from "./test-helpers";

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

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

describe("auth routes", () => {
  beforeEach(() => {
    executeMock.mockReset();
    ensureTestAuthEnv();
  });

  it("returns 400 when login payload is missing", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("required");
  });

  it("logs in and sets user session cookie (INV-AUTH-USER)", async () => {
    const password = "Secret123!";
    executeMock
      .mockResolvedValueOnce([
        [
          {
            id: 42,
            email: TEST_USER_EMAIL,
            password_hash: hashPassword(password),
            first_name: "Jane",
            last_name: "Doe",
            phone: "+40700000000",
            is_active: 1,
            email_verified_at: new Date().toISOString(),
          },
        ],
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app).post("/api/auth/login").send({
      email: `  ${TEST_USER_EMAIL.toUpperCase()}  `,
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.email).toBe(TEST_USER_EMAIL);
    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(String(setCookie)).toContain(USER_COOKIE_NAME);
  });

  it("rejects login when email is not verified", async () => {
    executeMock.mockResolvedValueOnce([
      [
        {
          id: 42,
          email: TEST_USER_EMAIL,
          password_hash: hashPassword("Secret123!"),
          first_name: "Jane",
          last_name: "Doe",
          phone: null,
          is_active: 1,
          email_verified_at: null,
        },
      ],
    ]);

    const response = await request(app).post("/api/auth/login").send({
      email: TEST_USER_EMAIL,
      password: "Secret123!",
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("verify your email");
  });

  it("clears user session cookie on logout (INV-AUTH-USER)", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", userCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(String(setCookie)).toContain(`${USER_COOKIE_NAME}=`);
  });

  it("returns 400 when verify-email token is missing", async () => {
    const response = await request(app).get("/api/auth/verify-email");

    expect(response.status).toBe(400);
    expect(response.text).toContain("Invalid verification link");
  });

  it("links guest orders when verify-email creates a new user", async () => {
    const future = new Date(Date.now() + 60_000);
    executeMock
      .mockResolvedValueOnce([
        [
          {
            id: 7,
            email: "guest@example.com",
            password_hash: "salt:hash",
            first_name: "Ion",
            last_name: "Popescu",
            company_name: "Firma SRL",
            vat_number: "RO12345678",
            phone: "+40700000000",
            verification_expires_at: future.toISOString(),
          },
        ],
      ])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 99 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app).get(
      "/api/auth/verify-email?token=valid-token",
    );

    expect(response.status).toBe(200);
    expect(response.text).toContain("Email confirmed successfully");
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE orders o"),
      [99, "guest@example.com"],
    );
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
