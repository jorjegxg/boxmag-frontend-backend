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
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

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

  it("links guest orders on login (INV-GUEST-LINK)", async () => {
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
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 2 }]);

    const response = await request(app).post("/api/auth/login").send({
      email: TEST_USER_EMAIL,
      password,
    });

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE orders o"),
      [42, TEST_USER_EMAIL],
    );
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

  it("updates existing user profile from pending on verify-email", async () => {
    const future = new Date(Date.now() + 60_000);
    executeMock
      .mockResolvedValueOnce([
        [
          {
            id: 7,
            email: "guest@example.com",
            password_hash: "salt:newhash",
            first_name: "Ion",
            last_name: "Popescu",
            company_name: "Firma SRL",
            vat_number: "RO12345678",
            phone: "+40700000000",
            verification_expires_at: future.toISOString(),
          },
        ],
      ])
      .mockResolvedValueOnce([[{ id: 42 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app).get(
      "/api/auth/verify-email?token=valid-token",
    );

    expect(response.status).toBe(200);
    expect(response.text).toContain("Email confirmed successfully");
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE users"),
      [
        "salt:newhash",
        "Ion",
        "Popescu",
        "Firma SRL",
        "RO12345678",
        "+40700000000",
        42,
      ],
    );
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE orders o"),
      [42, "guest@example.com"],
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

  it("rejects login with wrong password", async () => {
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
          email_verified_at: new Date().toISOString(),
        },
      ],
    ]);

    const response = await request(app).post("/api/auth/login").send({
      email: TEST_USER_EMAIL,
      password: "WrongPassword!",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain("Invalid email or password");
  });

  it("rejects login for unknown email", async () => {
    executeMock.mockResolvedValueOnce([[]]);

    const response = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "Secret123!",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain("Invalid email or password");
  });

  it("registers a pending user and sends verification email", async () => {
    const { sendVerificationEmail } = await import("../services/email");
    executeMock
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]);

    const response = await request(app).post("/api/auth/register").send({
      email: "  New.User@Example.com  ",
      password: "Secret123!",
      firstName: "New",
      surname: "User",
      companyName: "Acme SRL",
      vatNumber: "RO12345678",
      phone: "+40700000000",
      acceptRegulations: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({
      email: "new.user@example.com",
      requiresEmailVerification: true,
    });
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new.user@example.com",
        verifyUrl: expect.stringContaining("/verify-email?token="),
      }),
    );
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO pending_user_registrations"),
      expect.any(Array),
    );
  });

  it("returns 409 when registering an email that already exists", async () => {
    executeMock.mockResolvedValueOnce([[{ id: 42 }]]);

    const response = await request(app).post("/api/auth/register").send({
      email: TEST_USER_EMAIL,
      password: "Secret123!",
      firstName: "Jane",
      surname: "Doe",
      acceptRegulations: true,
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("already exists");
  });

  it("returns profile for authenticated user", async () => {
    executeMock.mockResolvedValueOnce([
      [
        {
          email: TEST_USER_EMAIL,
          first_name: "Jane",
          last_name: "Doe",
          phone: "+40700000000",
          company_name: "Boxmag SRL",
          vat_number: "RO12345678",
        },
      ],
    ]);

    const response = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", userCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({
      email: TEST_USER_EMAIL,
      firstName: "Jane",
      lastName: "Doe",
      phone: "+40700000000",
      companyName: "Boxmag SRL",
      vatNumber: "RO12345678",
    });
  });

  it("returns 401 for profile when session cookie is expired", async () => {
    const { createUserSessionToken, USER_COOKIE_NAME } = await import(
      "../config/user-auth"
    );
    const expired = createUserSessionToken(
      42,
      TEST_USER_EMAIL,
      Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 20,
    );
    expect(expired).toBeTruthy();

    const response = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", `${USER_COOKIE_NAME}=${expired}`);

    expect(response.status).toBe(401);
  });

  it("returns 401 for profile when session cookie is malformed", async () => {
    const response = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", `${USER_COOKIE_NAME}=not-a-valid-token`);

    expect(response.status).toBe(401);
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
